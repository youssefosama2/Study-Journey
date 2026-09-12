import React, { useEffect, useMemo, useState } from "react";
import {
  FaCamera,
  FaUser,
  FaStar,
  FaFire,
  FaTrophy,
  FaMedal,
  FaBook,
  FaClock,
  FaCheckCircle,
  FaBell,
  FaMoon,
  FaSignOutAlt,
  FaChevronLeft,
  FaAward,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import Swal from "sweetalert2";
import imageCompression from "browser-image-compression";
import { FiRefreshCw } from "react-icons/fi";
import Header from "../../components/Header/Header";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../utils/supabaseClient";
import "./Profile.css";

// =====================================================
// الشعب
// =====================================================

const divisions = [
  "علمي علوم",
  "علمي رياضة",
  "أدبي",
];

// =====================================================
// الصورة الافتراضية
// =====================================================

const getDefaultAvatar = (name = "Student") => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=3158dc&color=fff&size=300`;
};

// =====================================================
// ضغط الصورة
// =====================================================

const compressImage = async (file) => {
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 1000,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.7,
    });
    return compressed;
  } catch (error) {
    console.error("IMAGE COMPRESSION ERROR:", error);
    await Swal.fire({
      icon: "error",
      title: "خطأ في الصورة",
      text: error?.message || "تعذر ضغط الصورة",
      confirmButtonText: "حسنًا",
      confirmButtonColor: "#3158dc",
      scrollbarPadding: false,
      heightAuto: false,
    });
    return null;
  }
};

// =====================================================
// تحويل الأرقام العربية إلى إنجليزية
// =====================================================

const normalizeArabicNumbers = (value = "") => {
  return value
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    )
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    );
};

// =====================================================
// التحقق من رقم الهاتف المصري
// =====================================================

const isValidEgyptianPhone = (phone = "") => {
  const normalizedPhone = normalizeArabicNumbers(phone)
    .replace(/\s+/g, "")
    .trim();
  return /^01[0125]\d{8}$/.test(normalizedPhone);
};

// =====================================================
// Helpers للإحصائيات
// =====================================================

const firstValue = (row, keys, fallback = null) => {
  if (!row) return fallback;
  for (const key of keys) {
    if (
      row[key] !== undefined &&
      row[key] !== null &&
      row[key] !== ""
    ) {
      return row[key];
    }
  }
  return fallback;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getRowUserId = (row) => {
  return firstValue(row, [
    "user_id",
    "student_id",
    "profile_id",
  ]);
};

const getTaskCompleted = (task) => {
  const value = firstValue(task, [
    "is_completed",
    "completed",
    "completed_at",
    "status",
  ]);

  if (typeof value === "boolean") {
    return value;
  }

  if (
    typeof value === "string" &&
    value.toLowerCase() === "completed"
  ) {
    return true;
  }

  if (
    typeof value === "string" &&
    value.toLowerCase() === "done"
  ) {
    return true;
  }

  if (value !== null && value !== undefined) {
    if (typeof value === "string") {
      return value !== "";
    }
    return Boolean(value);
  }

  return false;
};

const getStudyDate = (row) => {
  return firstValue(row, [
    "studied_at",
    "study_date",
    "session_date",
    "created_at",
    "started_at",
  ]);
};

const getFocusSeconds = (session) => {
  const directSeconds = firstValue(session, [
    "duration_seconds",
    "focus_seconds",
    "elapsed_seconds",
    "total_seconds",
  ]);

  if (
    directSeconds !== null &&
    directSeconds !== undefined
  ) {
    return Math.max(0, toNumber(directSeconds));
  }

  const minutes = firstValue(session, [
    "duration_minutes",
    "focus_minutes",
    "minutes",
    "total_minutes",
  ]);

  if (
    minutes !== null &&
    minutes !== undefined
  ) {
    return Math.max(0, toNumber(minutes) * 60);
  }

  const start = firstValue(session, [
    "started_at",
    "start_time",
    "started_time",
  ]);

  const end = firstValue(session, [
    "ended_at",
    "end_time",
    "completed_at",
    "finished_at",
  ]);

  if (start && end) {
    const difference =
      new Date(end).getTime() -
      new Date(start).getTime();

    if (difference > 0) {
      return Math.floor(difference / 1000);
    }
  }

  return 0;
};

const getStudyMinutes = (study) => {
  const seconds = firstValue(study, [
    "duration_seconds",
    "study_seconds",
  ]);

  if (
    seconds !== null &&
    seconds !== undefined
  ) {
    return Math.max(0, toNumber(seconds) / 60);
  }

  const minutes = firstValue(study, [
    "duration_minutes",
    "study_minutes",
    "minutes",
  ]);

  if (
    minutes !== null &&
    minutes !== undefined
  ) {
    return Math.max(0, toNumber(minutes));
  }

  const start = firstValue(study, [
    "started_at",
    "start_time",
  ]);

  const end = firstValue(study, [
    "ended_at",
    "end_time",
    "completed_at",
  ]);

  if (start && end) {
    const difference =
      new Date(end).getTime() -
      new Date(start).getTime();

    if (difference > 0) {
      return difference / 60000;
    }
  }

  return 0;
};

const getAchievementRelationId = (row) => {
  return firstValue(row, [
    "achievement_id",
    "definition_id",
    "achievement_definition_id",
  ]);
};

const getAchievementUnlocked = (row) => {
  const value = firstValue(row, [
    "unlocked",
    "is_unlocked",
    "completed",
    "is_completed",
  ]);

  if (typeof value === "boolean") {
    return value;
  }

  if (value !== null && value !== undefined) {
    return Boolean(value);
  }

  return false;
};

const getAchievementTitle = (row) => {
  return firstValue(
    row,
    [
      "title",
      "name",
      "achievement_name",
    ],
    "إنجاز"
  );
};

const getAchievementDescription = (row) => {
  return firstValue(
    row,
    [
      "description",
      "subtitle",
      "details",
    ],
    "إنجاز جديد في رحلتك الدراسية"
  );
};

// =====================================================
// Profile
// =====================================================

const Profile = () => {
  const { darkMode, toggleDarkMode } = useTheme();

  // ===================================================
  // Student
  // ===================================================

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: "",
    phone: "",
    section: "",
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // ===================================================
  // بيانات الإحصائيات
  // ===================================================

  const [pointsData, setPointsData] = useState(null);
  const [tasksData, setTasksData] = useState([]);
  const [focusSessionsData, setFocusSessionsData] = useState([]);
  const [studyData, setStudyData] = useState([]);
  const [userAchievementsData, setUserAchievementsData] = useState([]);
  const [achievementDefinitionsData, setAchievementDefinitionsData] = useState([]);
  const [achievementLevelsData, setAchievementLevelsData] = useState([]);

  // ===================================================
  // إحصائيات حقيقية
  // ===================================================

  const stats = useMemo(() => {
    // -------------------------------------------------
    // النقاط
    // -------------------------------------------------

    const points = toNumber(
      firstValue(pointsData, [
        "total_points",
        "points",
        "current_points",
        "balance",
      ]),
      0
    );

    // -------------------------------------------------
    // المهام
    // -------------------------------------------------

    const completedTasks =
      tasksData.filter(getTaskCompleted).length;

    // -------------------------------------------------
    // التركيز
    // -------------------------------------------------

    const totalFocusSeconds =
      focusSessionsData.reduce(
        (total, session) =>
          total + getFocusSeconds(session),
        0
      );

    const focusHours =
      totalFocusSeconds / 3600;

    // -------------------------------------------------
    // أيام المذاكرة
    // -------------------------------------------------

    const studyDates = new Set();

    studyData.forEach((study) => {
      const date = getStudyDate(study);

      if (!date) return;

      const parsed = new Date(date);

      if (Number.isNaN(parsed.getTime())) {
        return;
      }

      studyDates.add(
        parsed.toISOString().slice(0, 10)
      );
    });

    // نضيف أيام جلسات التركيز أيضًا
    focusSessionsData.forEach((session) => {
      const date = firstValue(session, [
        "started_at",
        "start_time",
        "created_at",
        "session_date",
      ]);

      if (!date) return;

      const parsed = new Date(date);

      if (Number.isNaN(parsed.getTime())) {
        return;
      }

      studyDates.add(
        parsed.toISOString().slice(0, 10)
      );
    });

    const studyDays = studyDates.size;

    // -------------------------------------------------
    // Streak
    // -------------------------------------------------

    const sortedDates = Array.from(
      studyDates
    ).sort((a, b) =>
      b.localeCompare(a)
    );

    let streak = 0;

    if (sortedDates.length > 0) {
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      const firstDate = new Date(
        `${sortedDates[0]}T00:00:00`
      );

      const firstDifference =
        Math.floor(
          (today.getTime() -
            firstDate.getTime()) /
            86400000
        );

      // لو آخر نشاط اليوم أو أمس
      if (firstDifference <= 1) {
        streak = 1;

        for (
          let index = 1;
          index < sortedDates.length;
          index++
        ) {
          const currentDate =
            new Date(
              `${sortedDates[index - 1]}T00:00:00`
            );

          const previousDate =
            new Date(
              `${sortedDates[index]}T00:00:00`
            );

          const difference =
            Math.round(
              (currentDate.getTime() -
                previousDate.getTime()) /
                86400000
            );

          if (difference === 1) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // -------------------------------------------------
    // المستوى
    // -------------------------------------------------

    let level = 1;
    let currentLevelMinPoints = 0;
    let nextLevelMinPoints = null;

    if (
      achievementLevelsData.length > 0
    ) {
      const levels =
        achievementLevelsData
          .map((levelRow) => {
            const levelNumber =
              toNumber(
                firstValue(levelRow, [
                  "level",
                  "level_number",
                  "number",
                  "order",
                ]),
                0
              );

            const requiredPoints =
              toNumber(
                firstValue(levelRow, [
                  "required_points",
                  "min_points",
                  "points_required",
                  "points",
                  "xp_required",
                  "required_xp",
                ]),
                0
              );

            return {
              levelNumber,
              requiredPoints,
            };
          })
          .filter(
            (item) =>
              item.levelNumber > 0
          )
          .sort(
            (a, b) =>
              a.requiredPoints -
              b.requiredPoints
          );

      if (levels.length > 0) {
        const currentLevel =
          levels
            .filter(
              (item) =>
                points >=
                item.requiredPoints
            )
            .at(-1);

        if (currentLevel) {
          level =
            currentLevel.levelNumber;

          currentLevelMinPoints =
            currentLevel.requiredPoints;

          const nextLevel =
            levels.find(
              (item) =>
                item.requiredPoints >
                points
            );

          if (nextLevel) {
            nextLevelMinPoints =
              nextLevel.requiredPoints;
          }
        } else {
          level = 1;

          currentLevelMinPoints = 0;

          nextLevelMinPoints =
            levels[0].requiredPoints;
        }
      }
    } else {
      // fallback فقط لو جدول المستويات غير متاح
      level =
        Math.floor(points / 500) + 1;

      currentLevelMinPoints =
        (level - 1) * 500;

      nextLevelMinPoints =
        level * 500;
    }

    // -------------------------------------------------
    // تقدم المستوى
    // -------------------------------------------------

    let levelProgress = 0;

    if (
      nextLevelMinPoints !== null &&
      nextLevelMinPoints >
        currentLevelMinPoints
    ) {
      levelProgress =
        ((points -
          currentLevelMinPoints) /
          (nextLevelMinPoints -
            currentLevelMinPoints)) *
        100;

      levelProgress = Math.max(
        0,
        Math.min(100, levelProgress)
      );
    } else {
      levelProgress = 100;
    }

    const remainingPoints =
      nextLevelMinPoints !== null
        ? Math.max(
            0,
            nextLevelMinPoints - points
          )
        : 0;

    // -------------------------------------------------
    // الإنجازات
    // -------------------------------------------------

    const unlockedAchievements =
      userAchievementsData.filter(
        getAchievementUnlocked
      ).length;

    return {
      level,
      points,
      streak,
      achievements:
        unlockedAchievements,
      studyDays,
      focusHours,
      completedTasks,
      levelProgress,
      remainingPoints,
    };
  }, [
    pointsData,
    tasksData,
    focusSessionsData,
    studyData,
    userAchievementsData,
    achievementLevelsData,
  ]);

  // ===================================================
  // الإنجازات الحقيقية
  // ===================================================

  const achievements = useMemo(() => {
    const definitionMap = new Map();

    achievementDefinitionsData.forEach(
      (definition) => {
        definitionMap.set(
          definition.id,
          definition
        );
      }
    );

    const result = [];

    userAchievementsData.forEach(
      (userAchievement) => {
        const relationId =
          getAchievementRelationId(
            userAchievement
          );

        const definition =
          relationId
            ? definitionMap.get(relationId)
            : null;

        const source =
          definition || userAchievement;

        const unlocked =
          getAchievementUnlocked(
            userAchievement
          ) ||
          getAchievementUnlocked(
            definition
          );

        const icon =
          firstValue(source, [
            "icon",
            "icon_name",
            "icon_class",
          ]);

        let AchievementIcon =
          FaAward;

        if (icon === "FaFire") {
          AchievementIcon = FaFire;
        } else if (
          icon === "FaStar"
        ) {
          AchievementIcon = FaStar;
        } else if (
          icon === "FaTrophy"
        ) {
          AchievementIcon = FaTrophy;
        } else if (
          icon === "FaCheckCircle"
        ) {
          AchievementIcon =
            FaCheckCircle;
        } else if (
          icon === "FaClock"
        ) {
          AchievementIcon = FaClock;
        } else if (
          icon === "FaMedal"
        ) {
          AchievementIcon = FaMedal;
        }

        result.push({
          id:
            userAchievement.id ||
            relationId ||
            result.length,
          title:
            getAchievementTitle(source),
          description:
            getAchievementDescription(
              source
            ),
          icon: AchievementIcon,
          unlocked,
        });
      }
    );

    // -------------------------------------------------
    // لو user_achievements فاضي
    // نعرض definitions كـ locked
    // -------------------------------------------------

    if (
      result.length === 0 &&
      achievementDefinitionsData.length > 0
    ) {
      achievementDefinitionsData
        .slice(0, 6)
        .forEach((definition, index) => {
          result.push({
            id:
              definition.id ||
              index,
            title:
              getAchievementTitle(
                definition
              ),
            description:
              getAchievementDescription(
                definition
              ),
            icon: FaAward,
            unlocked: false,
          });
        });
    }

    return result.slice(0, 6);
  }, [
    userAchievementsData,
    achievementDefinitionsData,
  ]);

  // ===================================================
  // جلب Profile وكل بيانات الصفحة
  // ===================================================

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);

      // =================================================
      // المستخدم الحالي
      // =================================================

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const user = authData?.user;

      if (!user) {
        await Swal.fire({
          icon: "warning",
          title: "غير مسجل الدخول",
          text: "من فضلك سجل الدخول أولًا.",
          confirmButtonText:
            "تسجيل الدخول",
          confirmButtonColor: "#3158dc",
          scrollbarPadding: false,
          heightAuto: false,
        });

        window.location.href = "/Login";

        return;
      }

      console.log(
        "CURRENT USER:",
        user
      );

      // =================================================
      // Profile
      // =================================================

      const {
        data,
        error,
      } = await supabase
        .from("student_profiles")
        .select(
          `
          id,
          user_id,
          student_code,
          full_name,
          phone,
          avatar_url,
          section,
          notifications_enabled,
          created_at,
          updated_at
        `
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      console.log(
        "STUDENT PROFILE:",
        data
      );

      console.log(
        "PROFILE ERROR:",
        error
      );

      if (error) {
        throw error;
      }

      if (!data) {
        await Swal.fire({
          icon: "warning",
          title:
            "بيانات الطالب غير موجودة",
          text:
            "تم تسجيل الدخول ولكن لم يتم العثور على بيانات الملف الشخصي.",
          confirmButtonText: "حسنًا",
          confirmButtonColor: "#3158dc",
          scrollbarPadding: false,
          heightAuto: false,
        });

        return;
      }

      setStudent(data);

      setEditData({
        full_name:
          data.full_name || "",
        phone:
          data.phone || "",
        section:
          data.section || "",
      });

      setNotificationsEnabled(
        data.notifications_enabled ??
          true
      );

      // =================================================
      // جلب الإحصائيات
      // =================================================

      const [
        pointsResult,
        tasksResult,
        focusResult,
        studyResult,
        userAchievementsResult,
        definitionsResult,
        levelsResult,
      ] = await Promise.all([
        // -----------------------------------------------
        // النقاط
        // -----------------------------------------------

        supabase
          .from("user_points")
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle(),

        // -----------------------------------------------
        // المهام
        // -----------------------------------------------

        supabase
          .from("study_tasks")
          .select("*")
          .eq(
            "user_id",
            user.id
          ),

        // -----------------------------------------------
        // جلسات التركيز
        // -----------------------------------------------

        supabase
          .from(
            "study_focus_sessions"
          )
          .select("*")
          .eq(
            "user_id",
            user.id
          ),

        // -----------------------------------------------
        // الدراسة
        // -----------------------------------------------

        supabase
          .from(
            "student_lesson_study"
          )
          .select("*")
          .eq(
            "user_id",
            user.id
          ),

        // -----------------------------------------------
        // إنجازات الطالب
        // -----------------------------------------------

        supabase
          .from(
            "user_achievements"
          )
          .select("*")
          .eq(
            "user_id",
            user.id
          ),

        // -----------------------------------------------
        // تعريفات الإنجازات
        // -----------------------------------------------

        supabase
          .from(
            "achievement_definitions"
          )
          .select("*"),

        // -----------------------------------------------
        // مستويات الإنجازات
        // -----------------------------------------------

        supabase
          .from(
            "achievement_levels"
          )
          .select("*"),
      ]);

      // =================================================
      // تسجيل الأخطاء بدون إيقاف Profile
      // =================================================

      if (pointsResult.error) {
        console.warn(
          "USER POINTS ERROR:",
          pointsResult.error
        );
      }

      if (tasksResult.error) {
        console.warn(
          "TASKS ERROR:",
          tasksResult.error
        );
      }

      if (focusResult.error) {
        console.warn(
          "FOCUS SESSIONS ERROR:",
          focusResult.error
        );
      }

      if (studyResult.error) {
        console.warn(
          "STUDY DATA ERROR:",
          studyResult.error
        );
      }

      if (
        userAchievementsResult.error
      ) {
        console.warn(
          "USER ACHIEVEMENTS ERROR:",
          userAchievementsResult.error
        );
      }

      if (definitionsResult.error) {
        console.warn(
          "ACHIEVEMENT DEFINITIONS ERROR:",
          definitionsResult.error
        );
      }

      if (levelsResult.error) {
        console.warn(
          "ACHIEVEMENT LEVELS ERROR:",
          levelsResult.error
        );
      }

      // =================================================
      // حفظ البيانات
      // =================================================

      setPointsData(
        pointsResult.data || null
      );

      setTasksData(
        tasksResult.data || []
      );

      setFocusSessionsData(
        focusResult.data || []
      );

      setStudyData(
        studyResult.data || []
      );

      setUserAchievementsData(
        userAchievementsResult.data ||
          []
      );

      setAchievementDefinitionsData(
        definitionsResult.data || []
      );

      setAchievementLevelsData(
        levelsResult.data || []
      );

      console.log(
        "PROFILE POINTS:",
        pointsResult.data
      );

      console.log(
        "PROFILE TASKS:",
        tasksResult.data
      );

      console.log(
        "PROFILE FOCUS:",
        focusResult.data
      );

      console.log(
        "PROFILE STUDY:",
        studyResult.data
      );

      console.log(
        "PROFILE USER ACHIEVEMENTS:",
        userAchievementsResult.data
      );

      console.log(
        "PROFILE ACHIEVEMENT DEFINITIONS:",
        definitionsResult.data
      );

      console.log(
        "PROFILE ACHIEVEMENT LEVELS:",
        levelsResult.data
      );
    } catch (error) {
      console.error(
        "FETCH PROFILE ERROR:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "حدث خطأ",
        text:
          error?.message ||
          "تعذر تحميل بيانات الطالب",
        confirmButtonText: "حسنًا",
        confirmButtonColor: "#3158dc",
        scrollbarPadding: false,
        heightAuto: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // ===================================================
  // تحميل Profile
  // ===================================================

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  // ===================================================
  // تغيير بيانات التعديل
  // ===================================================

  const handleEditChange = (event) => {
    const { name, value } =
      event.target;

    if (name === "phone") {
      const normalizedValue =
        normalizeArabicNumbers(
          value
        );

      const onlyNumbers =
        normalizedValue.replace(
          /\D/g,
          ""
        );

      const limitedPhone =
        onlyNumbers.slice(0, 11);

      setEditData(
        (previous) => ({
          ...previous,
          phone: limitedPhone,
        })
      );

      return;
    }

    setEditData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  // ===================================================
  // حفظ Profile
  // ===================================================

  const handleSaveProfile = async () => {
    if (!student?.user_id) {
      return;
    }

    const fullName =
      editData.full_name.trim();

    const normalizedPhone =
      normalizeArabicNumbers(
        editData.phone
      )
        .replace(/\s+/g, "")
        .trim();

    const section =
      editData.section;

    if (!fullName) {
      await Swal.fire({
        icon: "warning",
        title: "الاسم مطلوب",
        text:
          "من فضلك اكتب الاسم بالكامل.",
        confirmButtonText: "حسنًا",
        confirmButtonColor: "#3158dc",
        scrollbarPadding: false,
        heightAuto: false,
        customClass: {
          container:
            "profile-swal-container",
        },
      });

      return;
    }

    if (!normalizedPhone) {
      await Swal.fire({
        icon: "warning",
        title:
          "رقم الهاتف مطلوب",
        text:
          "من فضلك اكتب رقم الهاتف.",
        confirmButtonText: "حسنًا",
        confirmButtonColor: "#3158dc",
        scrollbarPadding: false,
        heightAuto: false,
        customClass: {
          container:
            "profile-swal-container",
        },
      });

      return;
    }

    if (
      !isValidEgyptianPhone(
        normalizedPhone
      )
    ) {
      await Swal.fire({
        icon: "warning",
        title:
          "رقم الهاتف غير صحيح",
        text:
          "يرجى ادخال رقم هاتف صحيح.",
        confirmButtonText: "حسنًا",
        confirmButtonColor: "#3158dc",
        scrollbarPadding: false,
        heightAuto: false,
        customClass: {
          container:
            "profile-swal-container",
        },
      });

      return;
    }

    if (!section) {
      await Swal.fire({
        icon: "warning",
        title: "الشعبة مطلوبة",
        text:
          "من فضلك اختر الشعبة.",
        confirmButtonText: "حسنًا",
        confirmButtonColor: "#3158dc",
        scrollbarPadding: false,
        heightAuto: false,
        customClass: {
          container:
            "profile-swal-container",
        },
      });

      return;
    }

    setSaving(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("student_profiles")
        .update({
          full_name: fullName,
          phone: normalizedPhone,
          section,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "user_id",
          student.user_id
        )
        .select(
          `
          id,
          user_id,
          student_code,
          full_name,
          phone,
          avatar_url,
          section,
          notifications_enabled,
          created_at,
          updated_at
        `
        )
        .single();

      if (error) {
        throw error;
      }

      setStudent(data);

      setEditData({
        full_name:
          data.full_name || "",
        phone:
          data.phone || "",
        section:
          data.section || "",
      });

      setNotificationsEnabled(
        data.notifications_enabled ??
          true
      );

      setIsEditing(false);

      await Swal.fire({
        icon: "success",
        title: "تم الحفظ",
        text:
          "تم تحديث بيانات الملف الشخصي بنجاح.",
        confirmButtonText: "حسنًا",
        confirmButtonColor: "#3158dc",
        scrollbarPadding: false,
        heightAuto: false,
        customClass: {
          container:
            "profile-swal-container",
        },
      });
    } catch (error) {
      console.error(
        "UPDATE PROFILE ERROR:",
        error
      );

      await Swal.fire({
        icon: "error",
        title:
          "تعذر حفظ البيانات",
        text:
          error?.message ||
          "حدث خطأ أثناء تحديث البيانات.",
        confirmButtonText: "حسنًا",
        confirmButtonColor: "#3158dc",
        scrollbarPadding: false,
        heightAuto: false,
        customClass: {
          container:
            "profile-swal-container",
        },
      });
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // إلغاء التعديل
  // ===================================================

  const handleCancelEdit = () => {
    if (!student) {
      return;
    }

    setEditData({
      full_name:
        student.full_name || "",
      phone:
        student.phone || "",
      section:
        student.section || "",
    });

    setIsEditing(false);
  };

  // ===================================================
  // تغيير الصورة
  // ===================================================

  const handleChangePhoto = () => {
    if (uploadingPhoto) {
      return;
    }

    const input =
      document.createElement("input");

    input.type = "file";

    input.accept =
      "image/jpeg,image/png,image/webp,image/jpg";

    input.onchange = async (event) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        await Swal.fire({
          icon: "error",
          title: "ملف غير صالح",
          text:
            "من فضلك اختر صورة فقط.",
          confirmButtonText: "حسنًا",
          confirmButtonColor: "#3158dc",
          scrollbarPadding: false,
          heightAuto: false,
          customClass: {
            container:
              "profile-swal-container",
          },
        });

        return;
      }

      try {
        setUploadingPhoto(true);

        const oldAvatarUrl =
          student?.avatar_url ||
          null;

        const compressedFile =
          await compressImage(file);

        if (!compressedFile) {
          return;
        }

        const {
          data: authData,
          error: authError,
        } =
          await supabase.auth.getUser();

        if (
          authError ||
          !authData?.user
        ) {
          throw new Error(
            "يجب تسجيل الدخول أولًا."
          );
        }

        const user =
          authData.user;

        const newFilePath =
          `${user.id}/${Date.now()}.jpg`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from("avatars")
            .upload(
              newFilePath,
              compressedFile,
              {
                cacheControl:
                  "3600",
                upsert: false,
                contentType:
                  "image/jpeg",
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: publicUrlData,
        } =
          supabase.storage
            .from("avatars")
            .getPublicUrl(
              newFilePath
            );

        const avatarUrl =
          publicUrlData?.publicUrl;

        if (!avatarUrl) {
          await supabase.storage
            .from("avatars")
            .remove([
              newFilePath,
            ]);

          throw new Error(
            "تعذر الحصول على رابط الصورة."
          );
        }

        const {
          data: updatedProfile,
          error: updateError,
        } =
          await supabase
            .from(
              "student_profiles"
            )
            .update({
              avatar_url:
                avatarUrl,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "user_id",
              user.id
            )
            .select(
              `
              id,
              user_id,
              student_code,
              full_name,
              phone,
              avatar_url,
              section,
              notifications_enabled,
              created_at,
              updated_at
            `
            )
            .single();

        if (updateError) {
          await supabase.storage
            .from("avatars")
            .remove([
              newFilePath,
            ]);

          throw updateError;
        }

        setStudent(
          updatedProfile
        );

        // ---------------------------------------------
        // حذف الصورة القديمة
        // ---------------------------------------------

        if (oldAvatarUrl) {
          try {
            const oldUrl =
              new URL(
                oldAvatarUrl
              );

            const storageMarker =
              "/storage/v1/object/public/avatars/";

            const markerIndex =
              oldUrl.pathname.indexOf(
                storageMarker
              );

            if (
              markerIndex !==
              -1
            ) {
              const oldFilePath =
                decodeURIComponent(
                  oldUrl.pathname.substring(
                    markerIndex +
                      storageMarker.length
                  )
                );

              if (oldFilePath) {
                await supabase.storage
                  .from("avatars")
                  .remove([
                    oldFilePath,
                  ]);
              }
            }
          } catch (deleteError) {
            console.warn(
              "OLD IMAGE DELETE FAILED:",
              deleteError
            );
          }
        }

        await Swal.fire({
          icon: "success",
          title:
            "تم تحديث الصورة 🎉",
          text:
            "تم تغيير صورة الملف الشخصي بنجاح.",
          confirmButtonText:
            "حسنًا",
          confirmButtonColor:
            "#3158dc",
          scrollbarPadding: false,
          heightAuto: false,
          customClass: {
            container:
              "profile-swal-container",
          },
        });
      } catch (error) {
        console.error(
          "CHANGE PHOTO ERROR:",
          error
        );

        await Swal.fire({
          icon: "error",
          title:
            "تعذر رفع الصورة",
          text:
            error?.message ||
            "حدث خطأ أثناء تغيير الصورة.",
          confirmButtonText:
            "حسنًا",
          confirmButtonColor:
            "#3158dc",
          scrollbarPadding: false,
          heightAuto: false,
          customClass: {
            container:
              "profile-swal-container",
          },
        });
      } finally {
        setUploadingPhoto(false);
        event.target.value = "";
      }
    };

    input.click();
  };

  // ===================================================
  // الإشعارات
  // ===================================================

  const handleToggleNotifications =
    async () => {
      if (!student?.user_id) {
        return;
      }

      const newValue =
        !notificationsEnabled;

      setNotificationsEnabled(
        newValue
      );

      try {
        const {
          error,
        } =
          await supabase
            .from(
              "student_profiles"
            )
            .update({
              notifications_enabled:
                newValue,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "user_id",
              student.user_id
            );

        if (error) {
          throw error;
        }

        setStudent(
          (previous) => ({
            ...previous,
            notifications_enabled:
              newValue,
          })
        );
      } catch (error) {
        console.error(
          "NOTIFICATIONS UPDATE ERROR:",
          error
        );

        setNotificationsEnabled(
          !newValue
        );

        await Swal.fire({
          icon: "error",
          title:
            "تعذر تحديث الإشعارات",
          text:
            error?.message ||
            "حدث خطأ أثناء تحديث إعداد الإشعارات.",
          confirmButtonText:
            "حسنًا",
          confirmButtonColor:
            "#3158dc",
          scrollbarPadding: false,
          heightAuto: false,
          customClass: {
            container:
              "profile-swal-container",
          },
        });
      }
    };

  // ===================================================
  // تسجيل الخروج
  // ===================================================

  const handleLogout = async () => {
    const result =
      await Swal.fire({
        title:
          "تسجيل الخروج؟",
        text:
          "هل أنت متأكد من تسجيل الخروج؟",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText:
          "تسجيل الخروج",
        cancelButtonText:
          "إلغاء",
        confirmButtonColor:
          "#e74c3c",
        cancelButtonColor:
          "#6c757d",
        scrollbarPadding: false,
        heightAuto: false,
        customClass: {
          container:
            "profile-swal-container",
        },
      });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const {
        error,
      } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      localStorage.removeItem(
        "studentProfile"
      );

      window.location.href =
        "/Login";
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "حدث خطأ",
        text:
          error?.message ||
          "تعذر تسجيل الخروج.",
        confirmButtonText:
          "حسنًا",
        confirmButtonColor:
          "#3158dc",
        scrollbarPadding: false,
        heightAuto: false,
        customClass: {
          container:
            "profile-swal-container",
        },
      });
    }
  };

  // ===================================================
  // Loading
  // ===================================================

  if (loading) {
    return (
      <div
        className="profile-page"
        dir="rtl"
      >
        <main className="profile-content">
          <Header />
          <div className="page-loading">
            <div className="page-loading-spinner">
              <FiRefreshCw />
            </div>
            <h3>جاري تجهيز الملف الشخصي...</h3>
            <p>
              بنحمّل تابع مستواك وإنجازاتك
              وإعدادات حسابك.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ===================================================
  // Profile غير موجود
  // ===================================================

  if (!student) {
    return (
      <div
        className="profile-page"
        dir="rtl"
      >
        <main className="profile-content">
          <Header />
          <div className="profile-empty">
            <FaUser />
            <h2>بيانات الطالب غير موجودة</h2>
            <p>
              لم نتمكن من العثور على بيانات
              الملف الشخصي.
            </p>
            <button
              type="button"
              onClick={
                fetchStudentProfile
              }
            >
              إعادة المحاولة
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ===================================================
  // بيانات الطالب
  // ===================================================

  const studentName =
    student.full_name ||
    "الطالب";

  const studentPhone =
    student.phone ||
    "غير مضاف";

  const studentSection =
    student.section ||
    "غير محددة";

  const studentCode =
    student.student_code ||
    "—";

  const studentImage =
    student.avatar_url ||
    getDefaultAvatar(
      studentName
    );

  // ===================================================
  // UI
  // ===================================================

  return (
    <div
      className="profile-page"
      dir="rtl"
    >
      <Header />

      <main className="profile-content">

        {/* =================================================
            PROFILE HERO
        ================================================= */}

        <section className="profile-hero">

          <div className="profile-cover" />

          <div className="profile-main-info">

            <div className="profile-avatar-wrapper">

              <img
                src={studentImage}
                alt={studentName}
                className="profile-avatar"
              />

              <button
                type="button"
                className="profile-camera-button"
                onClick={
                  handleChangePhoto
                }
                disabled={
                  uploadingPhoto
                }
                aria-label="تغيير الصورة"
              >
                <FaCamera />
              </button>

            </div>

            <div className="profile-name-area">

              <span className="profile-welcome">
                أهلاً بك في رحلتك الدراسية 👋
              </span>

              <h2>
                {studentName}
              </h2>

              <div className="profile-level">

                <FaMedal />

                <span>
                  المستوى {stats.level}
                </span>

              </div>

              <div className="profile-student-details">

                <span>
                  كود الطالب:
                  <strong>
                    {studentCode}
                  </strong>
                </span>

                <span>
                  الشعبة:
                  <strong>
                    {studentSection}
                  </strong>
                </span>

                <span>
                  الهاتف:
                  <strong>
                    {studentPhone}
                  </strong>
                </span>

              </div>

            </div>

            <div className="profile-points-box">

              <div className="profile-points-icon">
                <FaStar />
              </div>

              <div>

                <span>
                  النقاط
                </span>

                <strong>
                  {stats.points.toLocaleString(
                    "ar-EG"
                  )}
                </strong>

              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            QUICK STATS
        ================================================= */}

        <section className="profile-stats-grid">

          <div className="profile-stat-card">

            <div className="profile-stat-icon fire">
              <FaFire />
            </div>

            <div className="profile-stat-content">

              <span>
                Streak
              </span>

              <strong>
                {stats.streak}
                <small>
                  يوم
                </small>
              </strong>

              <p>
                استمر على هذا الإنجاز 🔥
              </p>

            </div>

          </div>

          <div className="profile-stat-card">

            <div className="profile-stat-icon trophy">
              <FaTrophy />
            </div>

            <div className="profile-stat-content">

              <span>
                الإنجازات
              </span>

              <strong>
                {stats.achievements}
              </strong>

              <p>
                إنجاز تم تحقيقه
              </p>

            </div>

          </div>

          <div className="profile-stat-card">

            <div className="profile-stat-icon book">
              <FaBook />
            </div>

            <div className="profile-stat-content">

              <span>
                أيام المذاكرة
              </span>

              <strong>
                {stats.studyDays}
              </strong>

              <p>
                يوم من رحلة التعلم
              </p>

            </div>

          </div>

          <div className="profile-stat-card">

            <div className="profile-stat-icon clock">
              <FaClock />
            </div>

            <div className="profile-stat-content">

              <span>
                ساعات التركيز
              </span>

              <strong>
                {stats.focusHours.toLocaleString(
                  "ar-EG",
                  {
                    maximumFractionDigits: 1,
                  }
                )}
                <small>
                  ساعة
                </small>
              </strong>

              <p>
                وقت تركيز فعّال
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <section className="profile-layout">

          {/* =================================================
              ACHIEVEMENTS
          ================================================= */}

          <div className="profile-section-card achievements-card">

            <div className="profile-section-header">

              <div>

                <span className="section-label">
                  إنجازاتي
                </span>

                <h3>
                  الإنجازات والشارات
                </h3>

              </div>

              <div className="achievements-count">

                <FaTrophy />

                <span>
                  {stats.achievements} إنجاز
                </span>

              </div>

            </div>

            <div className="achievements-grid">

              {achievements.length > 0 ? (
                achievements.map(
                  (achievement) => {

                    const AchievementIcon =
                      achievement.icon;

                    return (
                      <div
                        className={`achievement-item ${
                          !achievement.unlocked
                            ? "achievement-locked"
                            : ""
                        }`}
                        key={
                          achievement.id
                        }
                      >

                        <div className="achievement-icon">
                          <AchievementIcon />
                        </div>

                        <div className="achievement-info">

                          <strong>
                            {
                              achievement.title
                            }
                          </strong>

                          <p>
                            {
                              achievement.description
                            }
                          </p>

                        </div>

                        {achievement.unlocked && (
                          <FaCheckCircle
                            className="achievement-check"
                          />
                        )}

                      </div>
                    );
                  }
                )
              ) : (
                <div className="achievement-item">
                  <div className="achievement-icon">
                    <FaAward />
                  </div>

                  <div className="achievement-info">
                    <strong>
                      لا توجد إنجازات بعد
                    </strong>

                    <p>
                      ابدأ المذاكرة وحقق أول إنجاز لك 🚀
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* =================================================
              SETTINGS
          ================================================= */}

          <div className="profile-section-card settings-card">

            <div className="profile-section-header">

              <div>

                <span className="section-label">
                  التخصيص
                </span>

                <h3>
                  الإعدادات
                </h3>

              </div>

              <div className="settings-header-icon">
                <FaUser />
              </div>

            </div>

            <div className="settings-list">

              {/* Notifications */}

              <div className="setting-item">

                <div className="setting-icon">
                  <FaBell />
                </div>

                <div className="setting-info">

                  <strong>
                    الإشعارات
                  </strong>

                  <span>
                    تلقي تنبيهات وتذكيرات الدراسة
                  </span>

                </div>

                <button
                  type="button"
                  className={`setting-switch ${
                    notificationsEnabled
                      ? "active"
                      : ""
                  }`}
                  onClick={
                    handleToggleNotifications
                  }
                  aria-label="تفعيل الإشعارات"
                >
                  <span />
                </button>

              </div>

              {/* Dark Mode */}

              <div className="setting-item">

                <div className="setting-icon">
                  <FaMoon />
                </div>

                <div className="setting-info">

                  <strong>
                    الوضع الداكن
                  </strong>

                  <span>
                    تغيير مظهر التطبيق
                  </span>

                </div>

                <button
                  type="button"
                  className={`setting-switch ${
                    darkMode
                      ? "active"
                      : ""
                  }`}
                  onClick={
                    toggleDarkMode
                  }
                  aria-label="تفعيل الوضع الداكن"
                >
                  <span />
                </button>

              </div>

              {/* Profile */}

              <button
                type="button"
                className="setting-item setting-action"
                onClick={() =>
                  setIsEditing(true)
                }
              >

                <div className="setting-icon">
                  <FaUser />
                </div>

                <div className="setting-info">

                  <strong>
                    بيانات الملف الشخصي
                  </strong>

                  <span>
                    تعديل الاسم ورقم الهاتف والشعبة
                  </span>

                </div>

                <FaChevronLeft className="setting-arrow" />

              </button>

            </div>

            {/* Logout */}

            <button
              type="button"
              className="logout-button"
              onClick={
                handleLogout
              }
            >

              <FaSignOutAlt />

              <span>
                تسجيل الخروج
              </span>

            </button>

          </div>

        </section>

        {/* =================================================
            PROGRESS
        ================================================= */}

        <section className="profile-progress-card">

          <div className="progress-info">

            <div className="progress-title">

              <div className="progress-icon">
                <FaMedal />
              </div>

              <div>

                <span>
                  رحلتك مستمرة
                </span>

                <h3>
                  المستوى {stats.level}
                </h3>

              </div>

            </div>

            <div className="progress-points">

              <strong>
                {stats.points.toLocaleString(
                  "ar-EG"
                )}
              </strong>

              <span>
                نقطة
              </span>

            </div>

          </div>

          <div className="level-progress">

            <div className="level-progress-header">

              <span>
                التقدم نحو المستوى التالي
              </span>

              <strong>
                {Math.round(
                  stats.levelProgress
                )}
                %
              </strong>

            </div>

            <div className="level-progress-track">

              <div
                className="level-progress-fill"
                style={{
                  width: `${stats.levelProgress}%`,
                }}
              />

            </div>

          </div>

          <p className="progress-message">

            {stats.remainingPoints > 0 ? (
              <>
                باقي لك{" "}

                <strong>
                  {stats.remainingPoints.toLocaleString(
                    "ar-EG"
                  )}{" "}
                  نقطة
                </strong>{" "}

                للوصول إلى المستوى{" "}
                {stats.level + 1} 🚀
              </>
            ) : (
              <>
                🎉 وصلت لأعلى مستوى متاح حاليًا!
              </>
            )}

          </p>

        </section>

      </main>

      {/* ===================================================
          EDIT PROFILE MODAL
      =================================================== */}

      {isEditing && (
        <div
          className="profile-modal-overlay"
          onClick={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              handleCancelEdit();
            }

          }}
        >

          <div className="profile-modal">

            <div className="profile-modal-header">

              <div>

                <span>
                  بياناتك
                </span>

                <h3>
                  تعديل الملف الشخصي
                </h3>

              </div>

              <button
                type="button"
                onClick={
                  handleCancelEdit
                }
                disabled={saving}
              >
                <FaTimes />
              </button>

            </div>

            <div className="profile-modal-body">

              {/* Name */}

              <div className="form-group">

                <label htmlFor="profile-name">
                  الاسم بالكامل
                </label>

                <input
                  id="profile-name"
                  type="text"
                  name="full_name"
                  value={
                    editData.full_name
                  }
                  onChange={
                    handleEditChange
                  }
                  disabled={saving}
                />

              </div>

              {/* Phone */}

              <div className="form-group">

                <label htmlFor="profile-phone">
                  رقم الهاتف
                </label>

                <input
                  id="profile-phone"
                  type="tel"
                  name="phone"
                  value={
                    editData.phone
                  }
                  onChange={
                    handleEditChange
                  }
                  maxLength={11}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="01xxxxxxxxx"
                  disabled={saving}
                />

              </div>

              {/* Section */}

              <div className="form-group">

                <label htmlFor="profile-section">
                  الشعبة
                </label>

                <select
                  id="profile-section"
                  name="section"
                  value={
                    editData.section
                  }
                  onChange={
                    handleEditChange
                  }
                  disabled={saving}
                >

                  <option value="">
                    اختر الشعبة
                  </option>

                  {divisions.map(
                    (division) => (
                      <option
                        key={division}
                        value={division}
                      >
                        {division}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* Student Code */}

              <div className="profile-readonly-field">

                <span>
                  كود الطالب
                </span>

                <strong>
                  {studentCode}
                </strong>

                <small>
                  كود الطالب لا يمكن تعديله
                </small>

              </div>

            </div>

            <div className="profile-modal-footer">

              <button
                type="button"
                className="profile-cancel-button"
                onClick={
                  handleCancelEdit
                }
                disabled={saving}
              >

                <FaTimes />

                إلغاء

              </button>

              <button
                type="button"
                className="profile-save-button"
                onClick={
                  handleSaveProfile
                }
                disabled={saving}
              >

                <FaSave />

                {saving
                  ? "جاري الحفظ..."
                  : "حفظ التعديلات"}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default Profile;