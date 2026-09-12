import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiClock,
  FiEdit3,
  FiFlag,
  FiList,
  FiPlay,
  FiRefreshCw,
  FiTarget,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";
import {
  FaBook,
  FaGlobeAmericas,
  FaBrain,
  FaCalculator,
  FaAtom,
  FaFlask,
  FaLeaf,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import Header from "../../components/Header/Header";
import { useTheme } from "../../context/ThemeContext";
import "./Home.css";
const subjectIconMap = {
  FaBook,
  FaGlobeAmericas,
  FaBrain,
  FaCalculator,
  FaAtom,
  FaFlask,
  FaLeaf,
};
const formatNumber = (value) =>
  new Intl.NumberFormat("ar-EG").format(Number(value || 0));
const formatMinutes = (minutes) => {
  const total = Math.max(0, Math.round(Number(minutes || 0)));
  if (total < 60) {
    return `${formatNumber(total)} د`;
  }
  const hours = Math.floor(total / 60);
  const remaining = total % 60;
  return remaining
    ? `${formatNumber(hours)} س ${formatNumber(remaining)} د`
    : `${formatNumber(hours)} س`;
};
const formatDuration = (seconds) => {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) {
    return `${formatNumber(hours)} س ${formatNumber(minutes)} د`;
  }
  return `${formatNumber(minutes)} د`;
};
const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const getStartOfWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - diff);
  return date;
};
const getDateKey = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const getArabicDay = (date) => {
  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "short",
  }).format(date);
};
const getArabicDate = (date) => {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};
const getPriorityLabel = (priority) => {
  const value = String(priority || "").toLowerCase();
  if (
    value === "high" ||
    value === "urgent" ||
    value === "عالية" ||
    value === "عاجل"
  ) {
    return "عالية";
  }
  if (value === "medium" || value === "متوسطة") {
    return "متوسطة";
  }
  return "منخفضة";
};
const getPriorityClass = (priority) => {
  const label = getPriorityLabel(priority);
  if (label === "عالية") return "priority-high";
  if (label === "متوسطة") return "priority-medium";
  return "priority-low";
};
const getGoalProgress = (goal) => {
  const direct =
    goal.progress ??
    goal.progress_percentage ??
    goal.completion_percentage ??
    null;
  if (direct !== null && direct !== undefined) {
    return Math.min(100, Math.max(0, Number(direct)));
  }
  const current = Number(
    goal.current_value ??
      goal.achieved_value ??
      goal.completed_value ??
      goal.progress_value ??
      0
  );
  const target = Number(
    goal.target_value ??
      goal.target ??
      goal.goal_value ??
      goal.target_minutes ??
      0
  );
  if (target > 0) {
    return Math.min(100, Math.max(0, (current / target) * 100));
  }
  return 0;
};
const getGoalTitle = (goal) => {
  return (
    goal.title ||
    goal.name ||
    goal.description ||
    goal.goal ||
    "هدف في طريق الإنجاز"
  );
};
const safeQuery = async (query) => {
  const { data, error } = await query;
  if (error) {
    console.warn("Home query warning:", error.message);
    return [];
  }
  return data || [];
};
export default function Home() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [focusSessions, setFocusSessions] = useState([]);
  const [studies, setStudies] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [lessonReviews, setLessonReviews] = useState([]);
  const [goals, setGoals] = useState([]);
  const [errors, setErrors] = useState([]);
  const [points, setPoints] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const today = useMemo(() => getToday(), []);
  const startOfWeek = useMemo(() => getStartOfWeek(), []);
  const loadHomeData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage("");
      try {
        // ==================== AUTH ====================
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) {
          throw authError;
        }
        if (!currentUser) {
          navigate("/login");
          return;
        }
        setUser(currentUser);
        // ==================== PROFILE ====================
        const { data: profileData, error: profileError } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("user_id", currentUser.id)
          .maybeSingle();
        if (profileError) {
          throw profileError;
        }
        setProfile(profileData || null);
        // ==================== SUBJECTS BY STUDENT SECTION ====================
        let sectionSubjects = [];
        if (profileData?.section) {
          // الحصول على section_id من اسم الـ section الموجود في profile
          const { data: sectionData, error: sectionError } = await supabase
            .from("sections")
            .select("id, name")
            .eq("name", profileData.section)
            .maybeSingle();
          if (sectionError) {
            console.warn(
              "Section query warning:",
              sectionError.message
            );
          }
          if (sectionData?.id) {
            // الحصول على المواد المرتبطة بالـ section
            const {
              data: subjectSectionsData,
              error: subjectSectionsError,
            } = await supabase
              .from("subject_sections")
              .select("subject_id")
              .eq("section_id", sectionData.id);
            if (subjectSectionsError) {
              console.warn(
                "Subject sections query warning:",
                subjectSectionsError.message
              );
            }
            const subjectIds = [
              ...new Set(
                (subjectSectionsData || [])
                  .map((item) => item.subject_id)
                  .filter(Boolean)
              ),
            ];
            if (subjectIds.length > 0) {
              const {
                data: subjectsData,
                error: subjectsError,
              } = await supabase
                .from("subjects")
                .select("*")
                .in("id", subjectIds)
                .eq("is_active", true)
                .order("name", { ascending: true });
              if (subjectsError) {
                console.warn(
                  "Subjects query warning:",
                  subjectsError.message
                );
              }
              sectionSubjects = subjectsData || [];
            }
          }
        }
        setSubjects(sectionSubjects);
        // ==================== باقي بيانات الصفحة ====================
        const [
          tasksData,
          focusData,
          studiesData,
          reviewsData,
          lessonReviewsData,
          goalsData,
          errorsData,
          pointsData,
          achievementsData,
        ] = await Promise.all([
          safeQuery(
            supabase
              .from("study_tasks")
              .select("*")
              .eq("user_id", currentUser.id)
              .order("plan_date", { ascending: true })
              .order("due_time", { ascending: true })
          ),
          safeQuery(
            supabase
              .from("study_focus_sessions")
              .select("*")
              .eq("user_id", currentUser.id)
              .order("started_at", { ascending: false })
              .limit(100)
          ),
          safeQuery(
            supabase
              .from("student_lesson_study")
              .select("*")
              .eq("user_id", currentUser.id)
              .order("studied_at", { ascending: false })
              .limit(300)
          ),
          safeQuery(
            supabase
              .from("study_reviews")
              .select("*")
              .eq("user_id", currentUser.id)
              .order("scheduled_for", { ascending: true })
              .limit(100)
          ),
          safeQuery(
            supabase
              .from("student_lesson_reviews")
              .select("*")
              .eq("user_id", currentUser.id)
              .order("scheduled_at", { ascending: true })
              .limit(100)
          ),
          safeQuery(
            supabase
              .from("study_goals")
              .select("*")
              .eq("user_id", currentUser.id)
              .order("created_at", { ascending: false })
              .limit(20)
          ),
          safeQuery(
            supabase
              .from("study_errors")
              .select("*")
              .eq("user_id", currentUser.id)
              .order("created_at", { ascending: false })
              .limit(100)
          ),
          safeQuery(
            supabase
              .from("user_points")
              .select("*")
              .eq("user_id", currentUser.id)
              .maybeSingle()
          ),
          safeQuery(
            supabase
              .from("user_achievements")
              .select("*")
              .eq("user_id", currentUser.id)
              .order("created_at", { ascending: false })
              .limit(6)
          ),
        ]);
        setTasks(tasksData);
        setFocusSessions(focusData);
        setStudies(studiesData);
        setReviews(reviewsData);
        setLessonReviews(lessonReviewsData);
        setGoals(goalsData);
        setErrors(errorsData);
        setPoints(pointsData || null);
        setAchievements(achievementsData);
      } catch (error) {
        console.error("Home loading error:", error);
        setErrorMessage(
          error?.message || "حدث خطأ أثناء تحميل بيانات الصفحة."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );
  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);
  // ==================== TODAY TASKS ====================
  const todayTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const taskDate = task.plan_date || task.due_date;
        return taskDate === today;
      })
      .sort((a, b) => {
        if (a.is_completed !== b.is_completed) {
          return a.is_completed ? 1 : -1;
        }
        return String(a.due_time || "").localeCompare(
          String(b.due_time || "")
        );
      });
  }, [tasks, today]);
  const todayCompletedTasks = useMemo(() => {
    return todayTasks.filter((task) => task.is_completed).length;
  }, [todayTasks]);
  // ==================== TODAY STUDY ====================
  const todayStudyMinutes = useMemo(() => {
    return studies
      .filter((study) => getDateKey(study.studied_at) === today)
      .reduce(
        (sum, study) => sum + Number(study.study_minutes || 0),
        0
      );
  }, [studies, today]);
  // ==================== TODAY FOCUS ====================
  const todayFocusSeconds = useMemo(() => {
    return focusSessions
      .filter((session) => {
        const date =
          getDateKey(session.started_at) ||
          getDateKey(session.created_at);
        return date === today;
      })
      .reduce(
        (sum, session) =>
          sum + Number(session.actual_seconds || 0),
        0
      );
  }, [focusSessions, today]);
  const todayFocusCount = useMemo(() => {
    return focusSessions.filter((session) => {
      const date =
        getDateKey(session.started_at) ||
        getDateKey(session.created_at);
      return date === today;
    }).length;
  }, [focusSessions, today]);
  // ==================== WEEK STUDY ====================
  const weekStudyMinutes = useMemo(() => {
    return studies
      .filter((study) => {
        const date = new Date(study.studied_at);
        return date >= startOfWeek && date <= new Date();
      })
      .reduce(
        (sum, study) => sum + Number(study.study_minutes || 0),
        0
      );
  }, [studies, startOfWeek]);
  const studyDays = useMemo(() => {
    const days = new Set();
    studies.forEach((study) => {
      const date = new Date(study.studied_at);
      if (date >= startOfWeek && date <= new Date()) {
        const key = getDateKey(study.studied_at);
        if (key) {
          days.add(key);
        }
      }
    });
    return days.size;
  }, [studies, startOfWeek]);
  // ==================== TASK COMPLETION ====================
  const taskCompletion = useMemo(() => {
    if (!todayTasks.length) return 0;
    return Math.round(
      (todayCompletedTasks / todayTasks.length) * 100
    );
  }, [todayTasks, todayCompletedTasks]);
  const weeklyTaskStats = useMemo(() => {
    const weekTasks = tasks.filter((task) => {
      const dateValue = task.plan_date || task.created_at;
      if (!dateValue) return false;
      const date = new Date(dateValue);
      return date >= startOfWeek && date <= new Date();
    });
    const completed = weekTasks.filter(
      (task) => task.is_completed
    ).length;
    return {
      total: weekTasks.length,
      completed,
      percentage: weekTasks.length
        ? Math.round((completed / weekTasks.length) * 100)
        : 0,
    };
  }, [tasks, startOfWeek]);
  // ==================== REVIEWS ====================
  const upcomingReviews = useMemo(() => {
    const standardReviews = reviews.map((review) => ({
      ...review,
      source: "study_reviews",
      date: review.scheduled_for,
      completed: Boolean(review.reviewed_at),
    }));
    const lessonReviewItems = lessonReviews.map((review) => ({
      ...review,
      source: "student_lesson_reviews",
      date: review.scheduled_at,
      completed:
        Boolean(review.completed_at) ||
        ["completed", "done", "reviewed"].includes(
          String(review.status || "").toLowerCase()
        ),
    }));
    return [...standardReviews, ...lessonReviewItems]
      .filter((review) => review.date)
      .filter((review) => !review.completed)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [reviews, lessonReviews]);
  const overdueReviews = useMemo(() => {
    const now = new Date();
    return upcomingReviews.filter(
      (review) => new Date(review.date) < now
    ).length;
  }, [upcomingReviews]);
  // ==================== GOALS ====================
  const activeGoals = useMemo(() => {
    return goals
      .filter((goal) => {
        const status = String(goal.status || "").toLowerCase();
        return ![
          "completed",
          "done",
          "achieved",
          "cancelled",
        ].includes(status);
      })
      .slice(0, 3);
  }, [goals]);
  // ==================== ERRORS ====================
  const uncorrectedErrors = useMemo(() => {
    return errors.filter((item) => {
      return (
        item.is_corrected === false &&
        String(item.status || "").toLowerCase() !== "corrected"
      );
    });
  }, [errors]);
  // ==================== SUBJECT STATS ====================
  const subjectStats = useMemo(() => {
    const map = new Map();
    // مهم:
    // هنا بنبدأ فقط بمواد الـ section الخاصة بالطالب
    // وممنوع نضيف أي مادة من studies لو مش موجودة في subjects.
    subjects.forEach((subject) => {
      map.set(subject.id, {
        id: subject.id,
        name: subject.name,
        icon: subject.icon,
        iconClass: subject.icon_class || null,
        studyMinutes: 0,
        studiesCount: 0,
        scoreTotal: 0,
        scoreCount: 0,
        completedTasks: 0,
        totalTasks: 0,
      });
    });
    studies.forEach((study) => {
      if (!study.subject_id) return;
      // لو المادة مش من مواد الـ section، تجاهلها
      if (!map.has(study.subject_id)) return;
      const item = map.get(study.subject_id);
      item.studyMinutes += Number(study.study_minutes || 0);
      item.studiesCount += 1;
      if (
        study.score !== null &&
        study.score !== undefined
      ) {
        item.scoreTotal += Number(study.score);
        item.scoreCount += 1;
      }
    });
    tasks.forEach((task) => {
      if (!task.subject_id || !map.has(task.subject_id)) return;
      const item = map.get(task.subject_id);
      item.totalTasks += 1;
      if (task.is_completed) {
        item.completedTasks += 1;
      }
    });
    return Array.from(map.values())
      .filter(
        (item) =>
          item.studyMinutes > 0 ||
          item.totalTasks > 0 ||
          item.scoreCount > 0
      )
      .map((item) => {
        const score = item.scoreCount
          ? item.scoreTotal / item.scoreCount
          : 0;
        const taskRate = item.totalTasks
          ? (item.completedTasks / item.totalTasks) * 100
          : 0;
        return {
          ...item,
          score,
          taskRate,
        };
      })
      .sort(
        (a, b) => b.studyMinutes - a.studyMinutes
      );
  }, [subjects, studies, tasks]);
  const maxSubjectMinutes = useMemo(() => {
    return Math.max(
      1,
      ...subjectStats.map(
        (subject) => subject.studyMinutes
      )
    );
  }, [subjectStats]);
  // ==================== WEEKLY CHART ====================
  const weeklyChart = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(startOfWeek);
      date.setDate(
        startOfWeek.getDate() + index
      );
      const key = getDateKey(date);
      const studyMinutes = studies
        .filter(
          (study) =>
            getDateKey(study.studied_at) === key
        )
        .reduce(
          (sum, study) =>
            sum + Number(study.study_minutes || 0),
          0
        );
      const focusMinutes = focusSessions
        .filter((session) => {
          const dateKey =
            getDateKey(session.started_at) ||
            getDateKey(session.created_at);
          return dateKey === key;
        })
        .reduce(
          (sum, session) =>
            sum +
            Number(session.actual_seconds || 0) / 60,
          0
        );
      const completedTasks = tasks.filter((task) => {
        if (
          !task.completed_at ||
          !task.is_completed
        ) {
          return false;
        }
        return (
          getDateKey(task.completed_at) === key
        );
      }).length;
      return {
        key,
        day: getArabicDay(date),
        studyMinutes: Math.round(studyMinutes),
        focusMinutes: Math.round(focusMinutes),
        completedTasks,
      };
    });
  }, [
    startOfWeek,
    studies,
    focusSessions,
    tasks,
  ]);
  // ==================== LATEST FOCUS ====================
  const latestFocusSession = useMemo(() => {
    return focusSessions.find(
      (session) =>
        Number(session.actual_seconds || 0) > 0 ||
        session.status === "completed"
    );
  }, [focusSessions]);
  // ==================== ACHIEVEMENTS ====================
  const lastAchievement = achievements[0];
  // ==================== DISPLAY NAME ====================
  const displayName =
    profile?.full_name ||
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "طالب";
  // ==================== LEVEL ====================
  const level = useMemo(() => {
    const currentPoints = Number(
      points?.points ??
        points?.total_points ??
        points?.current_points ??
        0
    );
    return Math.max(
      1,
      Math.floor(currentPoints / 250) + 1
    );
  }, [points]);
  const totalPoints = Number(
    points?.points ??
      points?.total_points ??
      points?.current_points ??
      0
  );
  // ==================== STREAK ====================
  const streak = useMemo(() => {
    const days = new Set(
      studies
        .map((study) =>
          getDateKey(study.studied_at)
        )
        .filter(Boolean)
    );
    let currentStreak = 0;
    const date = new Date();
    while (true) {
      const key = getDateKey(date);
      if (!days.has(key)) break;
      currentStreak += 1;
      date.setDate(
        date.getDate() - 1
      );
    }
    return currentStreak;
  }, [studies]);
  const handleRefresh = () => {
    loadHomeData(true);
  };
  // ==================== LOADING ====================
  if (loading) {
    return (
      <div
        className={`home-page ${
          darkMode ? "dark-mode" : ""
        }`}
      >
        <Header />
        <main className="home-container">
          <div className="page-loading">
            <div className="page-loading-spinner">
              <FiRefreshCw />
            </div>
            <h3>جاري تجهيز رحلتك الدراسية...</h3>
            <p>بنحمّل إحصائياتك وخطة اليوم.</p>
          </div>
        </main>
      </div>
    );
  }
  // ==================== ERROR ====================
  if (errorMessage) {
    return (
      <div
        className={`home-page ${
          darkMode ? "dark-mode" : ""
        }`}
      >
        <Header />
        <main className="home-container">
          <div className="home-error">
            <div className="error-icon">
              <FiAlertCircle />
            </div>
            <h3>تعذر تحميل الصفحة</h3>
            <p>{errorMessage}</p>
            <button
              type="button"
              className="home-primary-btn"
              onClick={() => loadHomeData()}
            >
              <FiRefreshCw />
              المحاولة مرة أخرى
            </button>
          </div>
        </main>
      </div>
    );
  }
  // ==================== PAGE ====================
  return (
    <div
      className={`home-page ${
        darkMode ? "dark-mode" : ""
      }`}
    >
      <Header />
      <main className="home-container">
        {/* ==================== HERO ==================== */}
        <section className="home-welcome">
          <div className="welcome-content">
            <div className="welcome-badge">
              <FiZap />
              <span>رحلتك الدراسية</span>
            </div>
            <h1>
              أهلاً يا <span>{displayName}</span> 👋
            </h1>
            <p>
              {taskCompletion >= 80
                ? "ممتاز! أنت ماشي بشكل رائع النهارده، كمل بنفس الحماس."
                : todayStudyMinutes > 0
                ? "خطوة جديدة اتضافت لرحلتك اليوم. استمر وخلّي التقدم عادة."
                : "ابدأ يومك بخطوة بسيطة، وكل دقيقة مذاكرة هتقربك من هدفك."}
            </p>
            <div className="welcome-date">
              <FiCalendar />
              <span>{getArabicDate(new Date())}</span>
            </div>
          </div>
          <div className="welcome-actions">
            <button
              type="button"
              className="home-primary-btn"
              onClick={() => navigate("/FocusSession")}
            >
              <FiPlay />
              ابدأ جلسة تركيز
            </button>
            <button
              type="button"
              className="home-secondary-btn"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <FiRefreshCw
                className={refreshing ? "spin" : ""}
              />
              تحديث
            </button>
          </div>
        </section>
        {/* ==================== QUICK STATS ==================== */}
        <section className="home-stats-grid">
          <article className="home-stat-card">
            <div className="stat-icon stat-icon-blue">
              <FiClock />
            </div>
            <div className="stat-info">
              <span>مذاكرة اليوم</span>
              <strong>{formatMinutes(todayStudyMinutes)}</strong>
              <small>إجمالي وقت الدراسة</small>
            </div>
          </article>
          <article className="home-stat-card">
            <div className="stat-icon stat-icon-purple">
              <FiActivity />
            </div>
            <div className="stat-info">
              <span>جلسات التركيز</span>
              <strong>{formatNumber(todayFocusCount)}</strong>
              <small>{formatDuration(todayFocusSeconds)} تركيز</small>
            </div>
          </article>
          <article className="home-stat-card">
            <div className="stat-icon stat-icon-green">
              <FiCheckCircle />
            </div>
            <div className="stat-info">
              <span>مهام اليوم</span>
              <strong>
                {formatNumber(todayCompletedTasks)}
                <small className="stat-total">/ {formatNumber(todayTasks.length)}</small>
              </strong>
              <small>{formatNumber(taskCompletion)}% إنجاز</small>
            </div>
          </article>
          <article className="home-stat-card">
            <div className="stat-icon stat-icon-orange">
              <FiTrendingUp />
            </div>
            <div className="stat-info">
              <span>الاستمرارية</span>
              <strong>{formatNumber(streak)} يوم</strong>
              <small>Streak الحالي</small>
            </div>
          </article>
        </section>
        {/* ==================== MAIN GRID ==================== */}
        <section className="home-main-grid">
          {/* ==================== TODAY TASKS ==================== */}
          <article className="home-card today-tasks-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">خطة اليوم</span>
                <h2>مهامك اليوم</h2>
              </div>
              <button
                type="button"
                className="card-link-btn"
                onClick={() => navigate("/Tasks")}
              >
                كل المهام
                <FiChevronLeft />
              </button>
            </div>
            <div className="today-progress">
              <div className="progress-text">
                <span>إنجاز اليوم</span>
                <strong>{formatNumber(taskCompletion)}%</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${taskCompletion}%`,
                  }}
                />
              </div>
            </div>
            {todayTasks.length > 0 ? (
              <div className="tasks-list">
                {todayTasks
                  .slice(0, 6)
                  .map((task) => (
                    <div
                      className={`home-task ${
                        task.is_completed
                          ? "task-completed"
                          : ""
                      }`}
                      key={task.id}
                    >
                      <div
                        className={`task-check ${
                          task.is_completed
                            ? "checked"
                            : ""
                        }`}
                      >
                        {task.is_completed && <FiCheckCircle />}
                      </div>
                      <div className="task-content">
                        <h3>{task.title}</h3>
                        <div className="task-meta">
                          {task.duration_minutes > 0 && (
                            <span>
                              <FiClock />
                              {formatNumber(task.duration_minutes)} دقيقة
                            </span>
                          )}
                          {task.priority && (
                            <span
                              className={`task-priority ${getPriorityClass(
                                task.priority
                              )}`}
                            >
                              {getPriorityLabel(task.priority)}
                            </span>
                          )}
                        </div>
                      </div>
                      {task.due_time && <span className="task-time">{task.due_time}</span>}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="home-empty">
                <div className="empty-icon">
                  <FiCheckCircle />
                </div>
                <h3>اليوم فاضي من المهام 🎉</h3>
                <p>ممكن تستغل الوقت في المراجعة أو جلسة تركيز.</p>
                <button
                  type="button"
                  className="home-outline-btn"
                  onClick={() => navigate("/Tasks")}
                >
                  إضافة مهمة
                </button>
              </div>
            )}
          </article>
          {/* ==================== FOCUS ==================== */}
          <article className="home-card focus-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">Focus Session</span>
                <h2>جلسة التركيز</h2>
              </div>
              <div className="focus-card-icon">
                <FiActivity />
              </div>
            </div>
            <div className="focus-circle">
              <div className="focus-circle-inner">
                <FiClock />
                <strong>{formatDuration(todayFocusSeconds)}</strong>
                <span>تركيز اليوم</span>
              </div>
            </div>
            <div className="focus-summary">
              <div>
                <span>الجلسات</span>
                <strong>{formatNumber(todayFocusCount)}</strong>
              </div>
              <div>
                <span>هذا الأسبوع</span>
                <strong>{formatMinutes(weekStudyMinutes)}</strong>
              </div>
            </div>
            {latestFocusSession && (
              <div className="last-focus">
                <FiCheckCircle />
                <div>
                  <strong>آخر جلسة ناجحة</strong>
                  <span>{formatDuration(latestFocusSession.actual_seconds)}</span>
                </div>
              </div>
            )}
            <button
              type="button"
              className="focus-start-btn"
              onClick={() => navigate("/FocusSession")}
            >
              <FiPlay />
              ابدأ جلسة جديدة
            </button>
          </article>
          {/* ==================== REVIEWS ==================== */}
          <article className="home-card reviews-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">المراجعة</span>
                <h2>المراجعات القادمة</h2>
              </div>
              <button
                type="button"
                className="card-link-btn"
                onClick={() => navigate("/Review")}
              >
                فتح المراجعة
                <FiChevronLeft />
              </button>
            </div>
            {upcomingReviews.length > 0 ? (
              <div className="reviews-list">
                {upcomingReviews.map((review) => {
                  const reviewDate = new Date(review.date);
                  const isOverdue = reviewDate < new Date();
                  return (
                    <div
                      className="home-review-item"
                      key={`${review.source}-${review.id}`}
                    >
                      <div className="review-date">
                        <strong>
                          {reviewDate.toLocaleDateString("ar-EG", {
                            day: "numeric",
                          })}
                        </strong>
                        <span>
                          {reviewDate.toLocaleDateString("ar-EG", {
                            month: "short",
                          })}
                        </span>
                      </div>
                      <div className="review-content">
                        <h3>{review.title || review.lesson_title || "مراجعة درس"}</h3>
                        <span>
                          {isOverdue ? (
                            <b className="review-overdue">متأخرة</b>
                          ) : (
                            "مراجعة مجدولة"
                          )}
                        </span>
                      </div>
                      <FiChevronLeft className="review-arrow" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="home-empty compact">
                <div className="empty-icon">
                  <FiRefreshCw />
                </div>
                <h3>لا توجد مراجعات قريبة</h3>
                <p>أنت متابع جدول المراجعة بشكل ممتاز.</p>
              </div>
            )}
            {overdueReviews > 0 && (
              <div className="overdue-alert">
                <FiAlertCircle />
                <span>لديك {formatNumber(overdueReviews)} مراجعة تحتاج للانتباه.</span>
              </div>
            )}
          </article>
          {/* ==================== GOALS ==================== */}
          <article className="home-card goals-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">أهدافك</span>
                <h2>الأهداف الحالية</h2>
              </div>
              <button
                type="button"
                className="card-link-btn"
                onClick={() => navigate("/Goals")}
              >
                كل الأهداف
                <FiChevronLeft />
              </button>
            </div>
            {activeGoals.length > 0 ? (
              <div className="goals-list">
                {activeGoals.map((goal) => {
                  const progress = getGoalProgress(goal);
                  return (
                    <div
                      className="home-goal"
                      key={goal.id}
                    >
                      <div className="goal-top">
                        <div className="goal-icon">
                          <FiTarget />
                        </div>
                        <div className="goal-title">
                          <h3>{getGoalTitle(goal)}</h3>
                          <span>{formatNumber(Math.round(progress))}%</span>
                        </div>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="home-empty compact">
                <div className="empty-icon">
                  <FiTarget />
                </div>
                <h3>لسه مفيش أهداف</h3>
                <p>حدد هدف واضح وابدأ تبني تقدمك عليه.</p>
                <button
                  type="button"
                  className="home-outline-btn"
                  onClick={() => navigate("/Goals")}
                >
                  إضافة هدف
                </button>
              </div>
            )}
          </article>
        </section>
        {/* ==================== SUBJECTS ==================== */}
        <section className="home-card subjects-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">تقدمك الدراسي</span>
              <h2>المواد الدراسية</h2>
            </div>
            <button
              type="button"
              className="card-link-btn"
              onClick={() => navigate("/Subjects")}
            >
              كل المواد
              <FiChevronLeft />
            </button>
          </div>
          {subjectStats.length > 0 ? (
            <div className="subjects-list">
              {subjectStats
                .slice(0, 6)
                .map((subject) => {
                  const percentage = Math.round(
                    (subject.studyMinutes / maxSubjectMinutes) * 100
                  );
                  return (
                    <div
                      className="subject-progress-item"
                      key={subject.id}
                    >
                      <div className="subject-main">
                        <div className="subject-icon">
                          {subject.iconClass &&
                          subjectIconMap[subject.iconClass] ? (
                            React.createElement(subjectIconMap[subject.iconClass])
                          ) : (
                            <FiBookOpen />
                          )}
                        </div>
                        <div className="subject-info">
                          <h3>{subject.name}</h3>
                          <div className="subject-meta">
                            <span>{formatMinutes(subject.studyMinutes)}</span>
                            {subject.scoreCount > 0 && (
                              <span>متوسط {Math.round(subject.score)}%</span>
                            )}
                          </div>
                        </div>
                        <strong className="subject-percent">{formatNumber(percentage)}%</strong>
                      </div>
                      <div className="subject-progress-track">
                        <div
                          className="subject-progress-fill"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="home-empty">
              <div className="empty-icon">
                <FiBookOpen />
              </div>
              <h3>ابدأ مذاكرة أول مادة</h3>
              <p>بمجرد تسجيل جلسات المذاكرة هنقدر نعرض تقدمك هنا.</p>
              <button
                type="button"
                className="home-primary-btn"
                onClick={() => navigate("/Subjects")}
              >
                تصفح المواد
              </button>
            </div>
          )}
        </section>
        {/* ==================== WEEKLY ACTIVITY ==================== */}
        <section className="home-bottom-grid">
          <article className="home-card weekly-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">هذا الأسبوع</span>
                <h2>نشاطك الدراسي</h2>
              </div>
              <div className="weekly-total">
                <FiTrendingUp />
                <span>{formatMinutes(weekStudyMinutes)}</span>
              </div>
            </div>
            <div className="weekly-chart">
              {weeklyChart.map((day) => {
                const maxValue = Math.max(
                  60,
                  ...weeklyChart.map(
                    (item) =>
                      item.studyMinutes
                  )
                );
                const height = Math.max(
                  day.studyMinutes > 0
                    ? 8
                    : 3,
                  (day.studyMinutes / maxValue) * 100
                );
                return (
                  <div
                    className="chart-day"
                    key={day.key}
                  >
                    <div className="chart-value">
                      {day.studyMinutes > 0
                        ? formatNumber(day.studyMinutes)
                        : ""}
                    </div>
                    <div className="chart-bar-area">
                      <div
                        className="chart-bar"
                        style={{
                          height: `${height}%`,
                        }}
                      />
                    </div>
                    <span>{day.day}</span>
                  </div>
                );
              })}
            </div>
            <div className="weekly-footer">
              <div>
                <FiCalendar />
                <span>{formatNumber(studyDays)} أيام مذاكرة</span>
              </div>
              <div>
                <FiCheckCircle />
                <span>{formatNumber(weeklyTaskStats.completed)} من {formatNumber(weeklyTaskStats.total)} مهمة</span>
              </div>
            </div>
          </article>
          {/* ==================== ERRORS ==================== */}
          <article className="home-card errors-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">تعلم من أخطائك</span>
                <h2>متابعة الأخطاء</h2>
              </div>
              <button
                type="button"
                className="card-link-btn"
                onClick={() => navigate("/Errors")}
              >
                فتح الأخطاء
                <FiChevronLeft />
              </button>
            </div>
            <div className="error-stat-box">
              <div className="error-stat-icon">
                <FiAlertCircle />
              </div>
              <div>
                <strong>{formatNumber(uncorrectedErrors.length)}</strong>
                <span>خطأ يحتاج للمراجعة</span>
              </div>
            </div>
            {errors.length > 0 ? (
              <div className="recent-errors">
                {errors.slice(0, 3).map((item) => (
                  <div
                    className="recent-error-item"
                    key={item.id}
                  >
                    <span className="error-dot" />
                    <div>
                      <h3>{item.title}</h3>
                      <span>{item.is_corrected ? "تم التصحيح" : "غير مصحح"}</span>
                    </div>
                    <FiChevronLeft />
                  </div>
                ))}
              </div>
            ) : (
              <div className="home-empty compact">
                <div className="empty-icon">
                  <FiCheckCircle />
                </div>
                <h3>ممتاز!</h3>
                <p>مفيش أخطاء مسجلة حتى الآن.</p>
              </div>
            )}
          </article>
          {/* ==================== ACHIEVEMENTS ==================== */}
          <article className="home-card achievements-card">
            <div className="card-header">
              <div>
                <span className="card-eyebrow">إنجازاتك</span>
                <h2>آخر الإنجازات</h2>
              </div>
              <button
                type="button"
                className="card-link-btn"
                onClick={() => navigate("/Achievements")}
              >
                كل الإنجازات
                <FiChevronLeft />
              </button>
            </div>
            <div className="level-box">
              <div className="level-icon">
                <FiAward />
              </div>
              <div className="level-info">
                <span>المستوى الحالي</span>
                <strong>المستوى {formatNumber(level)}</strong>
              </div>
              <div className="level-points">
                <strong>{formatNumber(totalPoints)}</strong>
                <span>نقطة</span>
              </div>
            </div>
            {lastAchievement ? (
              <div className="latest-achievement">
                <div className="achievement-icon">
                  <FiAward />
                </div>
                <div>
                  <span>آخر إنجاز</span>
                  <h3>{lastAchievement.title || lastAchievement.name || "إنجاز جديد"}</h3>
                </div>
              </div>
            ) : (
              <div className="achievement-empty">
                <FiAward />
                <span>أول إنجاز ليك قريب، استمر في التقدم!</span>
              </div>
            )}
            <button
              type="button"
              className="achievement-btn"
              onClick={() => navigate("/Achievements")}
            >
              استكشف الإنجازات
              <FiChevronLeft />
            </button>
          </article>
        </section>
        {/* ==================== QUICK ACTIONS ==================== */}
        <section className="home-card quick-actions-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">اختصارات سريعة</span>
              <h2>إيه اللي عايز تعمله؟</h2>
            </div>
          </div>
          <div className="quick-actions-grid">
            <button
              type="button"
              className="quick-action"
              onClick={() => navigate("/FocusSession")}
            >
              <span className="quick-action-icon focus">
                <FiPlay />
              </span>
              <span>
                <strong>جلسة تركيز</strong>
                <small>ابدأ المذاكرة الآن</small>
              </span>
              <FiChevronLeft />
            </button>
            <button
              type="button"
              className="quick-action"
              onClick={() => navigate("/Tasks")}
            >
              <span className="quick-action-icon tasks">
                <FiList />
              </span>
              <span>
                <strong>المهام</strong>
                <small>نظم يومك الدراسي</small>
              </span>
              <FiChevronLeft />
            </button>
            <button
              type="button"
              className="quick-action"
              onClick={() => navigate("/Plan")}
            >
              <span className="quick-action-icon plan">
                <FiCalendar />
              </span>
              <span>
                <strong>الخطة الدراسية</strong>
                <small>خطط للأيام القادمة</small>
              </span>
              <FiChevronLeft />
            </button>
            <button
              type="button"
              className="quick-action"
              onClick={() => navigate("/Notes")}
            >
              <span className="quick-action-icon notes">
                <FiEdit3 />
              </span>
              <span>
                <strong>ملاحظة جديدة</strong>
                <small>سجل أفكارك وملاحظاتك</small>
              </span>
              <FiChevronLeft />
            </button>
            <button
              type="button"
              className="quick-action"
              onClick={() => navigate("/Review")}
            >
              <span className="quick-action-icon review">
                <FiRefreshCw />
              </span>
              <span>
                <strong>مراجعة</strong>
                <small>راجع اللي ذاكرته</small>
              </span>
              <FiChevronLeft />
            </button>
            <button
              type="button"
              className="quick-action"
              onClick={() => navigate("/Reports")}
            >
              <span className="quick-action-icon reports">
                <FiTrendingUp />
              </span>
              <span>
                <strong>التقارير</strong>
                <small>شوف تقدمك بالتفصيل</small>
              </span>
              <FiChevronLeft />
            </button>
          </div>
        </section>
        {/* ==================== FINAL CTA ==================== */}
        <section className="home-final-cta">
          <div className="final-cta-icon">
            <FiFlag />
          </div>
          <div>
            <h2>كل يوم فرصة جديدة للتقدم 🚀</h2>
            <p>مش لازم تعمل كل حاجة مرة واحدة. ابدأ بخطوة صغيرة النهارده.</p>
          </div>
          <button
            type="button"
            className="home-primary-btn"
            onClick={() => navigate("/Plan")}
          >
            افتح خطتي
            <FiChevronLeft />
          </button>
        </section>
      </main>
    </div>
  );
}