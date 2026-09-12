import React, { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaBook,
  FaCalendarAlt,
  FaTasks,
  FaBullseye,
  FaStickyNote,
  FaTimesCircle,
  FaRedo,
  FaClock,
  FaTrophy,
  FaUserFriends,
  FaBars,
  FaBell,
  FaMoon,
  FaSun,
  FaSignOutAlt,
  FaChevronLeft,
  FaPlus,
  FaClipboardList,
  FaBookOpen,
  FaChartLine,
  FaUser,
  FaCreditCard,
} from "react-icons/fa";
import Swal from "sweetalert2";

import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../utils/supabaseClient";

import "./Header.css";

// =========================================================
// DEFAULT AVATAR
// =========================================================

const getDefaultAvatar = (name = "Student") => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=3158dc&color=fff&size=300`;
};

// =========================================================
// NOTIFICATION STORAGE
// =========================================================

const READ_NOTIFICATIONS_KEY =
  "study_journey_read_notifications";

// =========================================================
// HEADER
// =========================================================

const Header = () => {
  const { darkMode, toggleDarkMode } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // =======================================================
  // ADMIN
  // =======================================================

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecking, setAdminChecking] = useState(true);

  // =======================================================
  // STUDENT
  // =======================================================

  const [student, setStudent] = useState({
    name: "الطالب",
    image: getDefaultAvatar("الطالب"),
    notifications: 0,
    section: "",
  });

  const [studentLoading, setStudentLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

  // =========================================================
  // GET READ NOTIFICATIONS
  // =========================================================

  const getReadNotificationIds = useCallback(() => {
    try {
      const saved = localStorage.getItem(
        READ_NOTIFICATIONS_KEY
      );

      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved);

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(
        "HEADER READ NOTIFICATIONS ERROR:",
        error
      );

      return [];
    }
  }, []);

  // =========================================================
  // CHECK ADMIN
  // =========================================================

  useEffect(() => {
    let isMounted = true;

    const checkAdmin = async () => {
      try {
        setAdminChecking(true);

        // -----------------------------------------------
        // الحصول على المستخدم الحالي
        // -----------------------------------------------

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error(
            "HEADER ADMIN USER ERROR:",
            userError
          );

          if (isMounted) {
            setIsAdmin(false);
            setAdminChecking(false);
          }

          return;
        }

        // -----------------------------------------------
        // لا يوجد مستخدم
        // -----------------------------------------------

        if (!user) {
          if (isMounted) {
            setIsAdmin(false);
            setAdminChecking(false);
          }

          return;
        }

        // -----------------------------------------------
        // التحقق من صلاحية الأدمن
        // -----------------------------------------------

        const {
          data,
          error,
        } = await supabase.rpc("is_admin");

        if (error) {
          console.error(
            "HEADER ADMIN CHECK ERROR:",
            error
          );

          if (isMounted) {
            setIsAdmin(false);
            setAdminChecking(false);
          }

          return;
        }

        console.log(
          "HEADER ADMIN STATUS:",
          data
        );

        if (isMounted) {
          setIsAdmin(data === true);
          setAdminChecking(false);
        }
      } catch (error) {
        console.error(
          "HEADER ADMIN ERROR:",
          error
        );

        if (isMounted) {
          setIsAdmin(false);
          setAdminChecking(false);
        }
      }
    };

    checkAdmin();

    // -----------------------------------------------
    // متابعة تغييرات تسجيل الدخول
    // -----------------------------------------------

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================================================
  // FETCH STUDENT PROFILE
  // =========================================================

  useEffect(() => {
    let isMounted = true;

    const fetchStudentProfile = async () => {
      try {
        setStudentLoading(true);

        // -----------------------------------------------
        // المستخدم الحالي
        // -----------------------------------------------

        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const user = authData?.user;

        // -----------------------------------------------
        // لو مفيش مستخدم
        // -----------------------------------------------

        if (!user) {
          if (!isMounted) return;

          setStudent({
            name: "الطالب",
            image: getDefaultAvatar("الطالب"),
            notifications: 0,
            section: "",
          });

          return;
        }

        // -----------------------------------------------
        // جلب بيانات الطالب
        // -----------------------------------------------

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
              notifications_enabled
            `
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          if (!isMounted) return;

          setStudent({
            name: "الطالب",
            image: getDefaultAvatar("الطالب"),
            notifications: 0,
            section: "",
          });

          return;
        }

        // -----------------------------------------------
        // البيانات الحقيقية
        // -----------------------------------------------

        const studentName =
          data.full_name?.trim() || "الطالب";

        const studentImage =
          data.avatar_url ||
          getDefaultAvatar(studentName);

        if (!isMounted) return;

        setStudent({
          name: studentName,
          image: studentImage,
          notifications: 0,
          section: data.section || "",
        });

        console.log(
          "HEADER STUDENT PROFILE:",
          data
        );
      } catch (error) {
        console.error(
          "HEADER FETCH PROFILE ERROR:",
          error
        );

        if (!isMounted) return;

        setStudent({
          name: "الطالب",
          image: getDefaultAvatar("الطالب"),
          notifications: 0,
          section: "",
        });
      } finally {
        if (isMounted) {
          setStudentLoading(false);
        }
      }
    };

    fetchStudentProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // =========================================================
  // FETCH REAL NOTIFICATION COUNT
  // =========================================================

  const fetchNotificationCount = useCallback(
    async () => {
      try {
        // ---------------------------------------------------
        // المستخدم الحالي
        // ---------------------------------------------------

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setStudent((prev) => ({
            ...prev,
            notifications: 0,
          }));

          return;
        }

        // ---------------------------------------------------
        // الإشعارات المقروءة
        // ---------------------------------------------------

        const readIds =
          getReadNotificationIds();

        let unreadCount = 0;

        // ===================================================
        // 1. ACHIEVEMENTS
        // ===================================================

        const {
          data: achievements,
          error: achievementsError,
        } = await supabase
          .from("user_achievements")
          .select(
            `
              id,
              achievement_id,
              created_at
            `
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(30);

        if (achievementsError) {
          console.error(
            "HEADER ACHIEVEMENTS COUNT ERROR:",
            achievementsError
          );
        }

        if (achievements?.length) {
          achievements.forEach((achievement) => {
            const notificationId =
              `achievement-${achievement.id}`;

            if (
              !readIds.includes(notificationId)
            ) {
              unreadCount += 1;
            }
          });
        }

        // ===================================================
        // 2. SUBSCRIPTION WARNING
        // ===================================================

        const today = new Date()
          .toISOString()
          .split("T")[0];

        const {
          data: subscription,
          error: subscriptionError,
        } = await supabase
          .from("subscriptions")
          .select(
            `
              id,
              end_date,
              status,
              subscription_type
            `
          )
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
            "HEADER SUBSCRIPTION COUNT ERROR:",
            subscriptionError
          );
        }

        if (subscription) {
          const endDate = new Date(
            `${subscription.end_date}T23:59:59`
          );

          const todayDate = new Date();

          const difference =
            endDate.getTime() -
            todayDate.getTime();

          const remainingDays = Math.ceil(
            difference /
              (1000 * 60 * 60 * 24)
          );

          if (
            remainingDays <= 3 &&
            remainingDays >= 0
          ) {
            const notificationId =
              `subscription-warning-${subscription.id}`;

            if (
              !readIds.includes(
                notificationId
              )
            ) {
              unreadCount += 1;
            }
          }
        }

        // ---------------------------------------------------
        // تحديث الرقم
        // ---------------------------------------------------

        setStudent((prev) => ({
          ...prev,
          notifications: unreadCount,
        }));

        console.log(
          "HEADER REAL NOTIFICATION COUNT:",
          unreadCount
        );
      } catch (error) {
        console.error(
          "HEADER NOTIFICATION COUNT ERROR:",
          error
        );

        setStudent((prev) => ({
          ...prev,
          notifications: 0,
        }));
      }
    },
    [getReadNotificationIds]
  );

  // =========================================================
  // LOAD NOTIFICATION COUNT
  // =========================================================

  useEffect(() => {
    fetchNotificationCount();

    // تحديث الرقم عند الرجوع للصفحة
    const handleStorage = () => {
      fetchNotificationCount();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, [
    fetchNotificationCount,
    location.pathname,
  ]);

  // =========================================================
  // REFRESH NOTIFICATIONS WHEN PAGE BECOMES VISIBLE
  // =========================================================

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible"
      ) {
        fetchNotificationCount();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [fetchNotificationCount]);

  // =========================================================
  // PAGE INFO
  // =========================================================

  const getPageInfo = () => {
    const path =
      location.pathname.toLowerCase();

    if (path === "/home" || path === "/") {
      return {
        title: "الرئيسية",
        subtitle:
          "تابع رحلتك الدراسية وحقق أهدافك",
        icon: FaHome,
      };
    }

    if (
      path === "/subjects" ||
      path.startsWith("/subjects/")
    ) {
      return {
        title: "المواد الدراسية",
        subtitle:
          "تابع موادك ودروسك ومستوى تقدمك",
        icon: FaBook,
      };
    }

    if (
      path === "/plan" ||
      path.startsWith("/plan/")
    ) {
      return {
        title: "الخطة",
        subtitle:
          "نظم وقتك وحقق أهدافك",
        icon: FaCalendarAlt,
      };
    }

    if (
      path === "/tasks" ||
      path.startsWith("/tasks/")
    ) {
      return {
        title: "المهام",
        subtitle:
          "تابع مهامك اليومية وأنجز المطلوب",
        icon: FaTasks,
      };
    }

    if (
      path === "/goals" ||
      path.startsWith("/goals/")
    ) {
      return {
        title: "الأهداف",
        subtitle:
          "حدد أهدافك واعمل على تحقيقها",
        icon: FaBullseye,
      };
    }

    if (
      path === "/notes" ||
      path.startsWith("/notes/")
    ) {
      return {
        title: "الملاحظات",
        subtitle:
          "احتفظ بملاحظاتك المهمة في مكان واحد",
        icon: FaStickyNote,
      };
    }

    if (
      path === "/errors" ||
      path.startsWith("/errors/")
    ) {
      return {
        title: "الأخطاء",
        subtitle:
          "راجع أخطاءك وتعلم منها",
        icon: FaTimesCircle,
      };
    }

    if (
      path === "/review" ||
      path.startsWith("/review/")
    ) {
      return {
        title: "المراجعة",
        subtitle:
          "راجع دروسك واستعد للاختبارات",
        icon: FaRedo,
      };
    }

    if (
      path === "/focussession" ||
      path.startsWith("/focussession/")
    ) {
      return {
        title: "جلسة التركيز",
        subtitle:
          "ركز في مذاكرتك وابتعد عن المشتتات",
        icon: FaClock,
      };
    }

    if (
      path === "/achievements" ||
      path.startsWith("/achievements/")
    ) {
      return {
        title: "الإنجازات",
        subtitle:
          "شاهد إنجازاتك وتقدمك الدراسي",
        icon: FaTrophy,
      };
    }

    if (
      path === "/friends" ||
      path.startsWith("/friends/")
    ) {
      return {
        title: "الأصدقاء",
        subtitle:
          "تواصل مع أصدقائك وشاركهم رحلتك الدراسية",
        icon: FaUserFriends,
      };
    }

    if (
      path === "/reports" ||
      path.startsWith("/reports/")
    ) {
      return {
        title: "التقارير والتحليل",
        subtitle:
          "حلل مستواك الدراسي واكتشف نقاط قوتك وضعفك",
        icon: FaChartLine,
      };
    }

    if (
      path === "/profile" ||
      path.startsWith("/profile/")
    ) {
      return {
        title: "الملف الشخصي",
        subtitle:
          "تابع مستواك وإنجازاتك وإعدادات حسابك",
        icon: FaUser,
      };
    }

    if (
      path === "/focusstatistics" ||
      path.startsWith("/focusstatistics/")
    ) {
      return {
        title: "إحصائيات التركيز",
        subtitle:
          "حلل وقت تركيزك وتابع تطور مستواك الدراسي",
        icon: FaChartLine,
      };
    }

    // =====================================================
    // NOTIFICATIONS
    // =====================================================

    if (
      path === "/notifications" ||
      path.startsWith("/notifications/")
    ) {
      return {
        title: "الإشعارات",
        subtitle:
          "تابع آخر المستجدات في رحلتك الدراسية",
        icon: FaBell,
      };
    }

    // =====================================================
    // ADMIN SUBSCRIPTIONS
    // =====================================================

    if (
      path === "/adminsubscriptions" ||
      path.startsWith("/adminsubscriptions/")
    ) {
      return {
        title: "إدارة الاشتراكات",
        subtitle:
          "إدارة اشتراكات الطلاب والباقات والمدفوعات",
        icon: FaCreditCard,
      };
    }

    return {
      title: "Study Journey",
      subtitle:
        "رحلتك الدراسية في مكان واحد",
      icon: FaHome,
    };
  };

  const pageInfo = getPageInfo();
  const PageIcon = pageInfo.icon;

  // =========================================================
  // SIDEBAR MENU
  // =========================================================

  const menuItems = [
    {
      title: "الرئيسية",
      path: "/home",
      icon: FaHome,
    },
    {
      title: "المواد الدراسية",
      path: "/Subjects",
      icon: FaBook,
    },
    {
      title: "الخطة الدراسية",
      path: "/Plan",
      icon: FaCalendarAlt,
    },
    {
      title: "المهام",
      path: "/Tasks",
      icon: FaTasks,
    },
    {
      title: "الأهداف",
      path: "/Goals",
      icon: FaBullseye,
    },
    {
      title: "الملاحظات",
      path: "/Notes",
      icon: FaStickyNote,
    },
    {
      title: "الأخطاء",
      path: "/Errors",
      icon: FaTimesCircle,
    },
    {
      title: "المراجعة",
      path: "/Review",
      icon: FaRedo,
    },
    {
      title: "جلسة التركيز",
      path: "/FocusSession",
      icon: FaClock,
    },
    {
      title: "إحصائيات التركيز",
      path: "/FocusStatistics",
      icon: FaChartLine,
    },
    {
      title: "التقارير والتحليل",
      path: "/Reports",
      icon: FaChartLine,
    },
    {
      title: "الإنجازات",
      path: "/Achievements",
      icon: FaTrophy,
    },
    {
      title: "الإشعارات",
      path: "/Notifications",
      icon: FaBell,
    },
    {
      title: "الملف الشخصي",
      path: "/Profile",
      icon: FaUser,
    },
    {
      title: "الاشتراك",
      path: "/Subscription",
      icon: FaCreditCard,
    },
    {
      title: "الأصدقاء",
      path: "/Friends",
      icon: FaUserFriends,
    },
  ];

  // =========================================================
  // QUICK ACTIONS
  // =========================================================

  const quickActions = [
    {
      title: "إضافة مهمة",
      icon: FaClipboardList,
      path: "/Tasks",
    },
    {
      title: "إضافة هدف",
      icon: FaBullseye,
      path: "/Goals",
    },
    {
      title: "إضافة ملاحظة",
      icon: FaStickyNote,
      path: "/Notes",
    },
    {
      title: "إضافة درس",
      icon: FaBookOpen,
      path: "/Subjects",
    },
    {
      title: "بدء جلسة تركيز",
      icon: FaClock,
      path: "/FocusSession",
    },
  ];

  // =========================================================
  // NAVIGATION
  // =========================================================

  const handleNavigate = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  const handleQuickAction = (path) => {
    setQuickAddOpen(false);
    navigate(path);
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    setSidebarOpen(false);

    const result = await Swal.fire({
      title: "تسجيل الخروج",
      text: "هل تريدين تسجيل الخروج من حسابك؟",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "تسجيل الخروج",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#df3c4a",
      reverseButtons: true,
      scrollbarPadding: false,
      heightAuto: false,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      // -----------------------------------------------
      // تسجيل الخروج الحقيقي من Supabase
      // -----------------------------------------------

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // -----------------------------------------------
      // تنظيف أي بيانات محلية قديمة
      // -----------------------------------------------

      localStorage.removeItem(
        "studentProfile"
      );

      // -----------------------------------------------
      // الانتقال إلى Login
      // -----------------------------------------------

      navigate("/Login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "HEADER LOGOUT ERROR:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "تعذر تسجيل الخروج",
        text:
          error?.message ||
          "حدث خطأ أثناء تسجيل الخروج.",
        confirmButtonText: "حسنًا",
        confirmButtonColor: "#3158dc",
        scrollbarPadding: false,
        heightAuto: false,
      });
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="dashboard-header">

        {/* PAGE TITLE */}

        <div className="header-page-area">

          <button
            type="button"
            className="sidebar-menu-button"
            onClick={() =>
              setSidebarOpen(true)
            }
            aria-label="فتح القائمة"
          >
            <FaBars />
          </button>

          <div className="header-page-info">

            <div className="header-page-icon">
              <PageIcon />
            </div>

            <div className="header-page-text">
              <h1>{pageInfo.title}</h1>
              <p>{pageInfo.subtitle}</p>
            </div>

          </div>

        </div>

        {/* HEADER TOOLS */}

        <div className="header-tools">

          {/* =================================================
              Notifications
          ================================================= */}

          <button
            type="button"
            className="notification-button"
            aria-label="الإشعارات"
            onClick={() =>
              navigate("/Notifications")
            }
          >
            <FaBell />

            {student.notifications > 0 && (
              <span className="notification-count">
                {student.notifications > 99
                  ? "99+"
                  : student.notifications}
              </span>
            )}
          </button>

          {/* Theme */}

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleDarkMode}
            aria-label={
              darkMode
                ? "الوضع الفاتح"
                : "الوضع الداكن"
            }
          >
            {darkMode ? (
              <FaSun />
            ) : (
              <FaMoon />
            )}
          </button>

          {/* Quick Add */}

          <div className="quick-add-wrapper">

            <button
              type="button"
              className={`quick-add-button ${
                quickAddOpen
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setQuickAddOpen(
                  (prev) => !prev
                )
              }
              aria-label="إضافة سريعة"
              aria-expanded={
                quickAddOpen
              }
            >
              <FaPlus />

              <span>
                إضافة سريعة
              </span>
            </button>

            {quickAddOpen && (
              <>
                <div
                  className="quick-add-overlay"
                  onClick={() =>
                    setQuickAddOpen(false)
                  }
                ></div>

                <div className="quick-add-menu">

                  <div className="quick-add-menu-header">

                    <div>

                      <strong>
                        إضافة سريعة
                      </strong>

                      <span>
                        اختار ما تريد إضافته
                      </span>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setQuickAddOpen(false)
                      }
                      aria-label="إغلاق"
                    >
                      <FaTimesCircle />
                    </button>

                  </div>

                  <div className="quick-add-list">

                    {quickActions.map(
                      (action) => {

                        const Icon =
                          action.icon;

                        return (
                          <button
                            type="button"
                            className="quick-add-item"
                            key={action.path}
                            onClick={() =>
                              handleQuickAction(
                                action.path
                              )
                            }
                          >
                            <span className="quick-add-icon">
                              <Icon />
                            </span>

                            <span className="quick-add-title">
                              {action.title}
                            </span>

                            <FaChevronLeft className="quick-add-arrow" />
                          </button>
                        );
                      }
                    )}

                  </div>

                </div>
              </>
            )}

          </div>

        </div>

      </header>

      {/* =====================================================
          SIDEBAR OVERLAY
      ===================================================== */}

      <div
        className={`sidebar-overlay ${
          sidebarOpen
            ? "show"
            : ""
        }`}
        onClick={() =>
          setSidebarOpen(false)
        }
      ></div>

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`dashboard-sidebar ${
          sidebarOpen
            ? "open"
            : ""
        }`}
      >

        {/* Sidebar Top */}

        <div className="sidebar-top">

          <div className="sidebar-brand">

            <div className="brand-icon">
              <FaBook />
            </div>

            <div>

              <h2>
                Study Journey
              </h2>

              <span>
                رحلتك الدراسية
              </span>

            </div>

          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={() =>
              setSidebarOpen(false)
            }
            aria-label="إغلاق القائمة"
          >
            <FaTimesCircle />
          </button>

        </div>

        {/* Profile */}

        <div className="sidebar-profile">

          <div className="sidebar-profile-image">

            <img
              src={student.image}
              alt={student.name}
            />

            <span className="sidebar-online"></span>

          </div>

          <div className="sidebar-profile-info">

            <strong>
              {studentLoading
                ? "جاري التحميل..."
                : student.name}
            </strong>

            <span>
              طالب
              {student.section
                ? ` • ${student.section}`
                : ""}
            </span>

          </div>

        </div>

        {/* Navigation */}

        <nav className="sidebar-navigation">

          <div className="sidebar-section-title">
            القائمة الرئيسية
          </div>

          <ul>

            {menuItems.map(
              (item) => {

                const Icon =
                  item.icon;

                return (
                  <li
                    key={item.path}
                  >

                    <NavLink
                      to={item.path}
                      className={({
                        isActive,
                      }) =>
                        `sidebar-link ${
                          isActive
                            ? "active"
                            : ""
                        }`
                      }
                      onClick={() =>
                        setSidebarOpen(
                          false
                        )
                      }
                    >

                      <span className="sidebar-link-icon">
                        <Icon />
                      </span>

                      <span className="sidebar-link-title">
                        {item.title}
                      </span>

                      <FaChevronLeft className="sidebar-link-arrow" />

                    </NavLink>

                  </li>
                );
              }
            )}

            {/* =================================================
                ADMIN MENU
            ================================================= */}

            {!adminChecking &&
              isAdmin && (
                <li>

                  <NavLink
                    to="/AdminSubscriptions"
                    className={({
                      isActive,
                    }) =>
                      `sidebar-link ${
                        isActive
                          ? "active"
                          : ""
                      }`
                    }
                    onClick={() =>
                      setSidebarOpen(
                        false
                      )
                    }
                  >

                    <span className="sidebar-link-icon">
                      <FaCreditCard />
                    </span>

                    <span className="sidebar-link-title">
                      إدارة الاشتراكات
                    </span>

                    <FaChevronLeft className="sidebar-link-arrow" />

                  </NavLink>

                </li>
              )}

          </ul>

        </nav>

        {/* Logout */}

        <div className="sidebar-bottom">

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >

            <span className="sidebar-link-icon">
              <FaSignOutAlt />
            </span>

            <span className="sidebar-link-title">
              تسجيل الخروج
            </span>

          </button>

        </div>

      </aside>
    </>
  );
};

export default Header;