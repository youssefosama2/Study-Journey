import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaTrophy,
  FaRocket,
  FaCreditCard,
  FaTasks,
  FaRedo,
  FaBullseye,
  FaCheckDouble,
  FaTrash,
  FaFilter,
  FaClock,
  FaArrowLeft,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { supabase } from "../../utils/supabaseClient";
import { useTheme } from "../../context/ThemeContext";
import "./Notifications.css";
import Header from "../../components/Header/Header";

const READ_STORAGE_KEY = "study_journey_read_notifications";

const Notifications = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [userId, setUserId] = useState(null);

  // =========================================================
  // LocalStorage
  // =========================================================

  const getReadNotifications = useCallback(() => {
    try {
      const saved = localStorage.getItem(READ_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Error reading notification storage:", error);
      return [];
    }
  }, []);

  const saveReadNotifications = useCallback((ids) => {
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error("Error saving notification storage:", error);
    }
  }, []);

  // =========================================================
  // Current User
  // =========================================================

  const getCurrentUser = useCallback(async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Notifications auth error:", error);
      return null;
    }

    return session?.user || null;
  }, []);

  // =========================================================
  // Format Time
  // =========================================================

  const formatTime = (date) => {
    if (!date) return "";

    const notificationDate = new Date(date);

    if (Number.isNaN(notificationDate.getTime())) {
      return "";
    }

    const now = new Date();
    const diff = now.getTime() - notificationDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
      return "منذ لحظات";
    }

    if (minutes < 60) {
      return `منذ ${minutes} دقيقة`;
    }

    if (hours < 24) {
      return `منذ ${hours} ساعة`;
    }

    if (days === 1) {
      return "أمس";
    }

    if (days < 7) {
      return `منذ ${days} أيام`;
    }

    return notificationDate.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // =========================================================
  // Load Notifications
  // =========================================================

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);

      const user = await getCurrentUser();

      if (!user) {
        setNotifications([]);
        return;
      }

      setUserId(user.id);

      const readIds = getReadNotifications();
      const result = [];

      // =====================================================
      // 1. Achievements
      // =====================================================

      const {
        data: achievements,
        error: achievementsError,
      } = await supabase
        .from("user_achievements")
        .select(`
          id,
          achievement_id,
          created_at
        `)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(30);

      if (achievementsError) {
        console.error(
          "Notifications achievements error:",
          achievementsError
        );
      }

      if (achievements?.length) {
        const achievementIds = [
          ...new Set(
            achievements
              .map((item) => item.achievement_id)
              .filter(Boolean)
          ),
        ];

        let achievementDefinitions = [];

        if (achievementIds.length) {
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
              category
            `)
            .in("id", achievementIds);

          if (error) {
            console.error(
              "Notifications achievement definitions error:",
              error
            );
          }

          achievementDefinitions = data || [];
        }

        achievements.forEach((item) => {
          const achievement = achievementDefinitions.find(
            (definition) =>
              definition.id === item.achievement_id
          );

          if (!achievement) return;

          result.push({
            id: `achievement-${item.id}`,
            type: "achievement",
            title: achievement.title || "إنجاز جديد",
            message:
              achievement.description ||
              "لقد حققت إنجازًا جديدًا 🎉",
            icon: achievement.icon || "🏆",
            points: achievement.reward_points || 0,
            date: item.created_at,
            link: "/Achievements",
            isRead: readIds.includes(
              `achievement-${item.id}`
            ),
          });
        });
      }

      // =====================================================
      // 2. Current Level
      // =====================================================

      const {
        data: pointsData,
        error: pointsError,
      } = await supabase
        .from("user_points")
        .select(`
          current_level,
          total_points,
          current_streak
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (pointsError) {
        console.error(
          "Notifications points error:",
          pointsError
        );
      }

      if (pointsData?.current_level) {
        const levelId =
          `level-${user.id}-${pointsData.current_level}`;

        result.push({
          id: levelId,
          type: "level",
          title: `المستوى ${pointsData.current_level}`,
          message:
            "أنت الآن في هذا المستوى. استمري في التقدم وحققي المزيد من الإنجازات 🚀",
          icon: "🚀",
          points: pointsData.total_points || 0,
          date: null,
          link: "/Achievements",
          isRead: readIds.includes(levelId),
          staticLevel: true,
        });
      }

      // =====================================================
      // 3. Subscription
      // =====================================================

      const today = new Date().toISOString().split("T")[0];

      const {
        data: subscription,
        error: subscriptionError,
      } = await supabase
        .from("subscriptions")
        .select(`
          id,
          start_date,
          end_date,
          duration_days,
          amount,
          status,
          subscription_type
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("end_date", today)
        .order("end_date", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (subscriptionError) {
        console.error(
          "Notifications subscription error:",
          subscriptionError
        );
      }

      if (subscription) {
        const endDate = new Date(
          `${subscription.end_date}T23:59:59`
        );
        const todayDate = new Date();
        const diff =
          endDate.getTime() - todayDate.getTime();

        const remainingDays = Math.ceil(
          diff / (1000 * 60 * 60 * 24)
        );

        if (remainingDays <= 3 && remainingDays >= 0) {
          const subscriptionId =
            `subscription-warning-${subscription.id}`;

          result.push({
            id: subscriptionId,
            type: "subscription",
            title: "اشتراكك على وشك الانتهاء",
            message:
              remainingDays === 0
                ? "اشتراكك ينتهي اليوم. جدد اشتراكك للاستمرار في رحلتك الدراسية."
                : `متبقي ${remainingDays} ${
                    remainingDays === 1
                      ? "يوم"
                      : "أيام"
                  } على انتهاء اشتراكك.`,
            icon: "💳",
            date: null,
            link: "/Subscription",
            isRead: readIds.includes(subscriptionId),
          });
        }
      }

      // =====================================================
      // Sort
      // =====================================================

      result.sort((a, b) => {
        if (!a.date && !b.date) {
          return 0;
        }

        if (!a.date) return -1;
        if (!b.date) return 1;

        return new Date(b.date) - new Date(a.date);
      });

      setNotifications(result);
    } catch (error) {
      console.error("Notifications loading error:", error);
    } finally {
      setLoading(false);
    }
  }, [getCurrentUser, getReadNotifications]);

  // =========================================================
  // Initial Load
  // =========================================================

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // =========================================================
  // Mark Read
  // =========================================================

  const markAsRead = (notificationId) => {
    const currentRead = getReadNotifications();

    if (!currentRead.includes(notificationId)) {
      saveReadNotifications([
        ...currentRead,
        notificationId,
      ]);
    }

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              isRead: true,
            }
          : notification
      )
    );
  };

  // =========================================================
  // Mark All Read
  // =========================================================

  const markAllAsRead = () => {
    const allIds = notifications.map(
      (notification) => notification.id
    );

    const currentRead = getReadNotifications();

    saveReadNotifications([
      ...new Set([
        ...currentRead,
        ...allIds,
      ]),
    ]);

    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        isRead: true,
      }))
    );

    Swal.fire({
      toast: true,
      position: "top",
      icon: "success",
      title: "تم تحديد جميع الإشعارات كمقروءة",
      showConfirmButton: false,
      timer: 1800,
    });
  };

  // =========================================================
  // Clear Read History
  // =========================================================

  const clearReadHistory = () => {
    if (!userId) return;

    Swal.fire({
      title: "مسح سجل القراءة؟",
      text: "سيتم اعتبار الإشعارات القديمة غير مقروءة مرة أخرى.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "نعم، مسح",
      cancelButtonText: "إلغاء",
      reverseButtons: true,
    }).then((result) => {
      if (!result.isConfirmed) return;

      saveReadNotifications([]);

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          isRead: false,
        }))
      );
    });
  };

  // =========================================================
  // Notification Click
  // =========================================================

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);

    if (notification.link) {
      navigate(notification.link);
    }
  };

  // =========================================================
  // Filter
  // =========================================================

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter(
        (notification) => !notification.isRead
      );
    }

    if (filter === "achievement") {
      return notifications.filter(
        (notification) =>
          notification.type === "achievement" ||
          notification.type === "level"
      );
    }

    if (filter === "subscription") {
      return notifications.filter(
        (notification) =>
          notification.type === "subscription"
      );
    }

    return notifications;
  }, [notifications, filter]);

  // =========================================================
  // Counts
  // =========================================================

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  const achievementCount = notifications.filter(
    (notification) =>
      notification.type === "achievement" ||
      notification.type === "level"
  ).length;

  // =========================================================
  // React Icon
  // مهم: هنا الأيقونات أصبحت ثابتة حسب النوع
  // =========================================================

  const getNotificationIcon = (notification) => {
    switch (notification.type) {
      case "achievement":
        return <FaTrophy />;
      case "level":
        return <FaRocket />;
      case "subscription":
        return <FaCreditCard />;
      case "task":
        return <FaTasks />;
      case "review":
        return <FaRedo />;
      case "goal":
        return <FaBullseye />;
      default:
        return <FaBell />;
    }
  };

  // =========================================================
  // Loading
  // =========================================================

  if (loading) {
    return (
      <main
        className={`notifications-page ${
          darkMode ? "dark-mode" : ""
        }`}
      >
        <div className="notifications-container">
          <Header />
          <div className="notifications-loading">
            <div className="notifications-spinner" />
            <p>جاري تحميل الإشعارات...</p>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // Render
  // =========================================================

  return (
    <main
      className={`notifications-page ${
        darkMode ? "dark-mode" : ""
      }`}
    >
      <div className="notifications-container">
        <Header />

        {/* =================================================
            Actions
        ================================================= */}

        <section className="notifications-actions-panel">
          <div className="notifications-actions-info">
            <span>
              {unreadCount > 0
                ? `لديك ${unreadCount} إشعار غير مقروء`
                : "جميع الإشعارات مقروءة"}
            </span>
            <small>يمكنك إدارة حالة الإشعارات من هنا</small>
          </div>

          <div className="notifications-header-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="notifications-action-btn"
                onClick={markAllAsRead}
              >
                <FaCheckDouble />
                تحديد الكل كمقروء
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                className="notifications-clear-btn"
                onClick={clearReadHistory}
              >
                <FaTrash />
                إعادة تعيين القراءة
              </button>
            )}
          </div>
        </section>

        {/* =================================================
            Stats
        ================================================= */}

        <section className="notifications-stats">
          <div className="notification-stat-card">
            <div className="notification-stat-icon">
              <FaBell />
            </div>
            <div>
              <span>كل الإشعارات</span>
              <strong>{notifications.length}</strong>
            </div>
          </div>

          <div className="notification-stat-card unread">
            <div className="notification-stat-icon">
              <FaClock />
            </div>
            <div>
              <span>غير مقروء</span>
              <strong>{unreadCount}</strong>
            </div>
          </div>

          <div className="notification-stat-card">
            <div className="notification-stat-icon">
              <FaTrophy />
            </div>
            <div>
              <span>إنجازات</span>
              <strong>{achievementCount}</strong>
            </div>
          </div>
        </section>

        {/* =================================================
            Filters
        ================================================= */}

        <section className="notifications-filters">
          <div className="notifications-filter-title">
            <FaFilter />
            <span>عرض الإشعارات</span>
          </div>

          <div className="notifications-filter-buttons">
            <button
              type="button"
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              الكل
            </button>

            <button
              type="button"
              className={filter === "unread" ? "active" : ""}
              onClick={() => setFilter("unread")}
            >
              غير مقروء
              {unreadCount > 0 && (
                <span>{unreadCount}</span>
              )}
            </button>

            <button
              type="button"
              className={
                filter === "achievement" ? "active" : ""
              }
              onClick={() => setFilter("achievement")}
            >
              الإنجازات
            </button>

            <button
              type="button"
              className={
                filter === "subscription" ? "active" : ""
              }
              onClick={() => setFilter("subscription")}
            >
              الاشتراك
            </button>
          </div>
        </section>

        {/* =================================================
            Notifications
        ================================================= */}

        {filteredNotifications.length === 0 ? (
          <div className="notifications-empty">
            <div className="notifications-empty-icon">
              <FaBell />
            </div>
            <h2>لا توجد إشعارات</h2>
            <p>
              عندما يكون هناك شيء جديد في رحلتك الدراسية سيظهر هنا.
            </p>

            {filter !== "all" && (
              <button
                type="button"
                onClick={() => setFilter("all")}
              >
                عرض كل الإشعارات
              </button>
            )}
          </div>
        ) : (
          <div className="notifications-list">
            {filteredNotifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                className={`notification-card ${
                  !notification.isRead ? "unread" : ""
                }`}
                onClick={() =>
                  handleNotificationClick(notification)
                }
              >
                <div
                  className={`notification-icon ${notification.type}`}
                >
                  {getNotificationIcon(notification)}
                </div>

                <div className="notification-content">
                  <div className="notification-top">
                    <span className="notification-category">
                      {notification.type === "achievement"
                        ? "إنجاز جديد"
                        : notification.type === "level"
                        ? "مستوى جديد"
                        : notification.type === "subscription"
                        ? "الاشتراك"
                        : notification.type === "task"
                        ? "مهمة"
                        : notification.type === "review"
                        ? "مراجعة"
                        : notification.type === "goal"
                        ? "هدف"
                        : "إشعار"}
                    </span>

                    {!notification.isRead && (
                      <span className="notification-new">
                        جديد
                      </span>
                    )}
                  </div>

                  <h3>{notification.title}</h3>

                  <p>{notification.message}</p>

                  <div className="notification-bottom">
                    {notification.date && (
                      <span className="notification-time">
                        <FaClock />
                        {formatTime(notification.date)}
                      </span>
                    )}

                    {notification.points > 0 &&
                      notification.type === "achievement" && (
                        <span className="notification-points">
                          ⭐ +{notification.points} نقطة
                        </span>
                      )}

                    <span className="notification-open">
                      عرض
                      <FaArrowLeft />
                    </span>
                  </div>
                </div>

                {!notification.isRead && (
                  <span className="notification-unread-dot" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Notifications;