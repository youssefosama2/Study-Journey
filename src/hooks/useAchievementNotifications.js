import { useEffect, useRef, useCallback } from "react";
import { supabase } from "../utils/supabaseClient";
import {
  showAchievementAlert,
  showLevelUpAlert,
} from "../utils/achievementNotifications";

const useAchievementNotifications = () => {
  const userRef = useRef(null);
  const previousLevelRef = useRef(null);

  const initializedRef = useRef(false);

  const notificationQueueRef = useRef([]);
  const showingNotificationRef = useRef(false);

  const achievementChannelRef = useRef(null);
  const pointsChannelRef = useRef(null);

  // مهم جدًا لمنع initialization قديمة من إكمال التنفيذ
  const initializationIdRef = useRef(0);

  const mountedRef = useRef(false);

  // =========================================================
  // Notification Queue
  // =========================================================

  const processQueue = useCallback(async () => {
    if (
      !mountedRef.current ||
      showingNotificationRef.current ||
      notificationQueueRef.current.length === 0
    ) {
      return;
    }

    showingNotificationRef.current = true;

    const notification =
      notificationQueueRef.current.shift();

    try {
      if (notification?.type === "achievement") {
        await showAchievementAlert(notification.data);
      }

      if (notification?.type === "level") {
        await showLevelUpAlert(notification.data);
      }
    } catch (error) {
      console.error("Notification error:", error);
    }

    showingNotificationRef.current = false;

    if (
      mountedRef.current &&
      notificationQueueRef.current.length > 0
    ) {
      setTimeout(() => {
        processQueue();
      }, 300);
    }
  }, []);

  const addToQueue = useCallback(
    (notification) => {
      if (!mountedRef.current || !notification) {
        return;
      }

      notificationQueueRef.current.push(notification);

      processQueue();
    },
    [processQueue]
  );

  // =========================================================
  // حذف Channel معين
  // =========================================================

  const removeChannelSafely = useCallback(
    async (channel) => {
      if (!channel) {
        return;
      }

      try {
        await supabase.removeChannel(channel);
      } catch (error) {
        console.warn(
          "Error removing realtime channel:",
          error
        );
      }
    },
    []
  );

  // =========================================================
  // حذف جميع Channels الخاصة بالإشعارات
  // =========================================================

  const removeRealtimeChannels = useCallback(async () => {
    const achievementChannel =
      achievementChannelRef.current;

    const pointsChannel =
      pointsChannelRef.current;

    achievementChannelRef.current = null;
    pointsChannelRef.current = null;

    if (achievementChannel) {
      await removeChannelSafely(achievementChannel);
    }

    if (pointsChannel) {
      await removeChannelSafely(pointsChannel);
    }
  }, [removeChannelSafely]);

  // =========================================================
  // حذف أي Channel قديم بنفس الاسم
  // =========================================================

  const removeChannelByName = useCallback(
    async (channelName) => {
      try {
        const channels = supabase
          .getChannels()
          .filter(
            (channel) =>
              channel.topic === `realtime:${channelName}`
          );

        if (channels.length === 0) {
          return;
        }

        console.log(
          "Removing existing realtime channel:",
          channelName
        );

        await Promise.all(
          channels.map((channel) =>
            removeChannelSafely(channel)
          )
        );
      } catch (error) {
        console.warn(
          "Error removing existing channel:",
          error
        );
      }
    },
    [removeChannelSafely]
  );

  // =========================================================
  // Initialize Notifications
  // =========================================================

  const initializeNotifications = useCallback(async () => {
    // -------------------------------------------------------
    // إنشاء ID جديد لهذه التهيئة
    // -------------------------------------------------------

    const initializationId =
      ++initializationIdRef.current;

    // -------------------------------------------------------
    // الحصول على Session
    // -------------------------------------------------------

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    // -------------------------------------------------------
    // لو initialization قديمة، نوقفها
    // -------------------------------------------------------

    if (
      !mountedRef.current ||
      initializationId !== initializationIdRef.current
    ) {
      return;
    }

    if (sessionError) {
      console.error(
        "Error getting auth session:",
        sessionError
      );

      return;
    }

    const user = session?.user;

    if (!user) {
      userRef.current = null;
      initializedRef.current = false;

      return;
    }

    userRef.current = user;

    const achievementChannelName =
      `achievement-notifications-${user.id}`;

    const levelChannelName =
      `level-notifications-${user.id}`;

    try {
      // =====================================================
      // تنظيف القنوات القديمة
      // =====================================================

      await removeRealtimeChannels();

      // -----------------------------------------------------
      // لو initialization قديمة بعد await
      // لا تكمل
      // -----------------------------------------------------

      if (
        !mountedRef.current ||
        initializationId !== initializationIdRef.current
      ) {
        return;
      }

      // =====================================================
      // حذف أي Channels موجودة بنفس الأسماء
      // =====================================================

      await removeChannelByName(
        achievementChannelName
      );

      await removeChannelByName(levelChannelName);

      if (
        !mountedRef.current ||
        initializationId !== initializationIdRef.current
      ) {
        return;
      }

      // =====================================================
      // الحصول على المستوى الحالي
      // =====================================================

      const {
        data: pointsData,
        error: pointsError,
      } = await supabase
        .from("user_points")
        .select(
          "current_level, total_points, current_streak"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (pointsError) {
        console.error(
          "Error fetching user points:",
          pointsError
        );
      }

      if (
        !mountedRef.current ||
        initializationId !== initializationIdRef.current
      ) {
        return;
      }

      if (pointsData) {
        previousLevelRef.current =
          pointsData.current_level;
      } else {
        previousLevelRef.current = null;
      }

      // =====================================================
      // مهم:
      // من هنا النظام جاهز لاستقبال الأحداث الجديدة
      // =====================================================

      initializedRef.current = true;

      // =====================================================
      // Achievement Channel
      // =====================================================

      const achievementChannel = supabase.channel(
        achievementChannelName
      );

      achievementChannel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_achievements",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          try {
            // -----------------------------------------------
            // التأكد أن هذا الـ channel ما زال صالحًا
            // -----------------------------------------------

            if (
              !mountedRef.current ||
              initializationId !==
                initializationIdRef.current
            ) {
              return;
            }

            const achievementId =
              payload.new?.achievement_id;

            if (!achievementId) {
              return;
            }

            // -----------------------------------------------
            // جلب بيانات الإنجاز
            // -----------------------------------------------

            const {
              data,
              error,
            } = await supabase
              .from("achievement_definitions")
              .select(`
                id,
                title,
                description,
                icon,
                icon_type,
                reward_points,
                category,
                target_value
              `)
              .eq("id", achievementId)
              .maybeSingle();

            if (error) {
              console.error(
                "Error fetching achievement:",
                error
              );

              return;
            }

            if (!data) {
              return;
            }

            addToQueue({
              type: "achievement",
              data,
            });
          } catch (error) {
            console.error(
              "Achievement notification error:",
              error
            );
          }
        }
      );

      // -----------------------------------------------------
      // subscribe بعد on
      // -----------------------------------------------------

      achievementChannel.subscribe((status) => {
        if (!mountedRef.current) {
          return;
        }

        console.log(
          "Achievement notification channel:",
          status
        );
      });

      achievementChannelRef.current =
        achievementChannel;

      // =====================================================
      // Level Channel
      // =====================================================

      const pointsChannel = supabase.channel(
        levelChannelName
      );

      pointsChannel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_points",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          try {
            if (
              !mountedRef.current ||
              initializationId !==
                initializationIdRef.current
            ) {
              return;
            }

            if (!initializedRef.current) {
              return;
            }

            const newLevel =
              payload.new?.current_level;

            const previousLevel =
              previousLevelRef.current;

            // -----------------------------------------------
            // تحديث المستوى الحالي
            // -----------------------------------------------

            previousLevelRef.current = newLevel;

            if (
              previousLevel === null ||
              newLevel === null ||
              newLevel === undefined
            ) {
              return;
            }

            // -----------------------------------------------
            // إشعار فقط عند زيادة المستوى
            // -----------------------------------------------

            if (newLevel <= previousLevel) {
              return;
            }

            // -----------------------------------------------
            // جلب بيانات المستوى
            // -----------------------------------------------

            const {
              data,
              error,
            } = await supabase
              .from("achievement_levels")
              .select(`
                id,
                level_number,
                title,
                min_points,
                max_points,
                icon,
                description
              `)
              .eq("level_number", newLevel)
              .maybeSingle();

            if (error) {
              console.error(
                "Error fetching level:",
                error
              );

              return;
            }

            if (!data) {
              addToQueue({
                type: "level",
                data: {
                  level_number: newLevel,
                  title: `المستوى ${newLevel}`,
                  icon: "🚀",
                },
              });

              return;
            }

            addToQueue({
              type: "level",
              data,
            });
          } catch (error) {
            console.error(
              "Level notification error:",
              error
            );
          }
        }
      );

      // -----------------------------------------------------
      // subscribe بعد on
      // -----------------------------------------------------

      pointsChannel.subscribe((status) => {
        if (!mountedRef.current) {
          return;
        }

        console.log(
          "Level notification channel:",
          status
        );
      });

      pointsChannelRef.current = pointsChannel;
    } catch (error) {
      console.error(
        "Notification initialization error:",
        error
      );
    }
  }, [
    addToQueue,
    removeRealtimeChannels,
    removeChannelByName,
  ]);

  // =========================================================
  // Main Effect
  // =========================================================

  useEffect(() => {
    mountedRef.current = true;

    let authSubscription = null;

    // -------------------------------------------------------
    // Initial initialization
    // -------------------------------------------------------

    initializeNotifications();

    // -------------------------------------------------------
    // Auth listener
    // -------------------------------------------------------

    const {
      data,
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(
          "Achievement notification auth event:",
          event
        );

        // ---------------------------------------------------
        // SIGNED OUT
        // ---------------------------------------------------

        if (event === "SIGNED_OUT") {
          // إلغاء أي initialization قديمة
          initializationIdRef.current += 1;

          userRef.current = null;

          previousLevelRef.current = null;

          initializedRef.current = false;

          notificationQueueRef.current = [];

          showingNotificationRef.current = false;

          removeRealtimeChannels();

          return;
        }

        // ---------------------------------------------------
        // SIGNED IN
        // ---------------------------------------------------

        if (
          event === "SIGNED_IN" &&
          session?.user
        ) {
          initializeNotifications();
        }
      }
    );

    authSubscription = data.subscription;

    // -------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------

    return () => {
      console.log(
        "Cleaning achievement notification system..."
      );

      // -----------------------------------------------------
      // إلغاء أي initialization معلقة
      // -----------------------------------------------------

      initializationIdRef.current += 1;

      mountedRef.current = false;

      initializedRef.current = false;

      userRef.current = null;

      previousLevelRef.current = null;

      // -----------------------------------------------------
      // إزالة Auth listener
      // -----------------------------------------------------

      if (authSubscription) {
        authSubscription.unsubscribe();
      }

      // -----------------------------------------------------
      // إزالة Channels
      // -----------------------------------------------------

      removeRealtimeChannels();

      // -----------------------------------------------------
      // تنظيف Queue
      // -----------------------------------------------------

      notificationQueueRef.current = [];

      showingNotificationRef.current = false;
    };
  }, [
    initializeNotifications,
    removeRealtimeChannels,
  ]);
};

export default useAchievementNotifications;