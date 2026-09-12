import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaArrowRight,
  FaBrain,
  FaCalendarAlt,
  FaChartBar,
  FaChartPie,
  FaCheckCircle,
  FaClock,
  FaFire,
  FaHourglassHalf,
  FaPause,
  FaPlay,
  FaRedo,
  FaTrophy,
  FaBookOpen,
  FaTimesCircle,
  FaBullseye,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import { supabase } from "../../utils/supabaseClient";
import "./FocusStatistics.css";
/* =========================================================
   HELPERS
========================================================= */
const formatDuration = (totalSeconds = 0) => {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${hours} س ${minutes} د`;
  }
  if (minutes > 0) {
    return `${minutes} د`;
  }
  return `${remainingSeconds} ث`;
};
const formatTime = (dateValue) => {
  if (!dateValue) {
    return "--";
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};
const formatDate = (dateValue) => {
  if (!dateValue) {
    return "--";
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
  });
};
const getDateKey = (dateValue) => {
  if (!dateValue) {
    return "";
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const getStartDate = (period) => {
  const now = new Date();
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "7days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "30days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  return null;
};
const getGoalResultText = (goalResult) => {
  switch (goalResult) {
    case "yes":
      return "تم تحقيق الهدف";
    case "partial":
      return "تحقيق جزئي";
    case "no":
      return "لم يتحقق";
    default:
      return "بدون تقييم";
  }
};
const getGoalResultClass = (goalResult) => {
  switch (goalResult) {
    case "yes":
      return "success";
    case "partial":
      return "partial";
    case "no":
      return "failed";
    default:
      return "neutral";
  }
};
const getStatusText = (status) => {
  switch (status) {
    case "completed":
      return "مكتملة";
    case "active":
      return "نشطة";
    case "paused":
      return "متوقفة";
    case "cancelled":
      return "ملغاة";
    case "canceled":
      return "ملغاة";
    default:
      return status || "غير معروف";
  }
};
const getStatusIcon = (status) => {
  switch (status) {
    case "completed":
      return <FaCheckCircle />;
    case "paused":
      return <FaPause />;
    case "active":
      return <FaPlay />;
    case "cancelled":
    case "canceled":
      return <FaTimesCircle />;
    default:
      return <FaClock />;
  }
};
/* =========================================================
   COMPONENT
========================================================= */
const FocusStatistics = () => {
  const navigate = useNavigate();
  /* =====================================================
     STATE
  ===================================================== */
  const [period, setPeriod] = useState("today");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  /* =====================================================
     FETCH SESSIONS
  ===================================================== */
  const fetchSessions = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError("");
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) {
          throw userError;
        }
        if (!user) {
          setSessions([]);
          setError("يجب تسجيل الدخول لعرض إحصائيات التركيز");
          return;
        }
        /*
         * نجلب البيانات مباشرة من الجدول الأساسي.
         *
         * لا نعتمد على views الإحصائيات.
         */
        let query = supabase
          .from("study_focus_sessions")
          .select(`
              id,
              user_id,
              subject_id,
              unit_id,
              lesson_id,
              review_id,
              session_type,
              goal_type,
              timer_mode,
              started_at,
              ended_at,
              planned_seconds,
              actual_seconds,
              status,
              goal_result,
              focus_level,
              feedback_note
            `)
          .eq("user_id", user.id)
          .order("started_at", {
            ascending: false,
          });
        const startDate = getStartDate(period);
        if (startDate) {
          query = query.gte("started_at", startDate.toISOString());
        }
        const {
          data,
          error: sessionsError,
        } = await query;
        if (sessionsError) {
          throw sessionsError;
        }
        setSessions(data || []);
      } catch (err) {
        console.error("FocusStatistics fetch error:", err);
        setError(err?.message || "حدث خطأ أثناء تحميل إحصائيات التركيز");
        setSessions([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period]
  );
  /* =====================================================
     INITIAL FETCH
  ===================================================== */
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);
  /* =====================================================
     REALTIME
  ===================================================== */
  useEffect(() => {
    let channel;
    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }
      channel = supabase
        .channel("focus-statistics-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "study_focus_sessions",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchSessions({
              silent: true,
            });
          }
        )
        .subscribe();
    };
    setupRealtime();
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchSessions]);
  /* =====================================================
     VALID SESSIONS
  ===================================================== */
  const validSessions = useMemo(() => {
    return sessions.filter(
      (session) =>
        session.session_type === "focus" &&
        session.status !== "cancelled" &&
        session.status !== "canceled"
    );
  }, [sessions]);
  /* =====================================================
     COMPLETED SESSIONS
  ===================================================== */
  const completedSessions = useMemo(() => {
    return validSessions.filter(
      (session) => session.status === "completed"
    );
  }, [validSessions]);
  /* =====================================================
     TOTAL FOCUS TIME
  ===================================================== */
  const totalFocusSeconds = useMemo(() => {
    return validSessions.reduce(
      (sum, session) =>
        sum +
        Math.max(
          0,
          Number(session.actual_seconds) || 0
        ),
      0
    );
  }, [validSessions]);
  /* =====================================================
     AVERAGE SESSION
  ===================================================== */
  const averageSessionSeconds = useMemo(() => {
    if (validSessions.length === 0) {
      return 0;
    }
    return Math.round(
      totalFocusSeconds / validSessions.length
    );
  }, [totalFocusSeconds, validSessions.length]);
  /* =====================================================
     GOAL RESULTS
  ===================================================== */
  const goalStats = useMemo(() => {
    const evaluated = completedSessions.filter(
      (session) => session.goal_result
    );
    const yes = evaluated.filter(
      (session) => session.goal_result === "yes"
    ).length;
    const partial = evaluated.filter(
      (session) => session.goal_result === "partial"
    ).length;
    const no = evaluated.filter(
      (session) => session.goal_result === "no"
    ).length;
    const achievement =
      evaluated.length > 0
        ? Math.round(
            ((yes + partial * 0.5) / evaluated.length) *
              100
          )
        : 0;
    return {
      evaluated: evaluated.length,
      yes,
      partial,
      no,
      achievement,
    };
  }, [completedSessions]);
  /* =====================================================
     TODAY SESSIONS
  ===================================================== */
  const todaySessions = useMemo(() => {
    const todayKey = getDateKey(new Date());
    return sessions.filter(
      (session) =>
        getDateKey(session.started_at) === todayKey
    );
  }, [sessions]);
  /* =====================================================
     SUBJECT DISTRIBUTION
  ===================================================== */
  const distribution = useMemo(() => {
    const map = {};
    validSessions.forEach((session) => {
      const subject =
        session.subject_name ||
        session.subject?.name ||
        "بدون مادة";
      const seconds = Math.max(
        0,
        Number(session.actual_seconds) || 0
      );
      if (!map[subject]) {
        map[subject] = 0;
      }
      map[subject] += seconds;
    });
    const entries = Object.entries(map)
      .map(([subject, seconds]) => ({
        subject,
        seconds,
      }))
      .sort(
        (a, b) => b.seconds - a.seconds
      );
    const total = entries.reduce(
      (sum, item) => sum + item.seconds,
      0
    );
    return entries.map((item, index) => ({
      ...item,
      percentage:
        total > 0
          ? Math.round(
              (item.seconds / total) * 100
            )
          : 0,
      index,
    }));
  }, [validSessions]);
  /* =====================================================
     NOTE
     =====================================================
     لأن جدول study_focus_sessions عندك يحتوي على subject_id
     فقط، وليس بالضرورة subject_name، سنقوم بجلب أسماء المواد
     بشكل منفصل.
  ====================================================== */
  const [subjectNames, setSubjectNames] = useState({});
  useEffect(() => {
    const loadSubjectNames = async () => {
      const ids = [
        ...new Set(
          validSessions
            .map(
              (session) => session.subject_id
            )
            .filter(Boolean)
        ),
      ];
      if (ids.length === 0) {
        setSubjectNames({});
        return;
      }
      const {
        data,
        error: subjectsError,
      } = await supabase
        .from("subjects")
        .select("id, name")
        .in("id", ids);
      if (subjectsError) {
        console.error(
          "subjects error:",
          subjectsError
        );
        return;
      }
      const map = {};
      (data || []).forEach((subject) => {
        map[String(subject.id)] = subject.name;
      });
      setSubjectNames(map);
    };
    loadSubjectNames();
  }, [validSessions]);
  /* =====================================================
     DISTRIBUTION WITH SUBJECT NAMES
  ===================================================== */
  const finalDistribution = useMemo(() => {
    const map = {};
    validSessions.forEach((session) => {
      const subject =
        subjectNames[String(session.subject_id)] ||
        "بدون مادة";
      const seconds = Math.max(
        0,
        Number(session.actual_seconds) || 0
      );
      if (!map[subject]) {
        map[subject] = 0;
      }
      map[subject] += seconds;
    });
    const entries = Object.entries(map)
      .map(([subject, seconds]) => ({
        subject,
        seconds,
      }))
      .sort(
        (a, b) => b.seconds - a.seconds
      );
    const total = entries.reduce(
      (sum, item) => sum + item.seconds,
      0
    );
    return entries.map((item, index) => ({
      ...item,
      percentage:
        total > 0
          ? Math.round(
              (item.seconds / total) * 100
            )
          : 0,
      index,
    }));
  }, [validSessions, subjectNames]);
  /* =====================================================
     LAST 7 DAYS
  ===================================================== */
  const weeklyData = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const key = getDateKey(date);
      const daySessions = validSessions.filter(
        (session) =>
          getDateKey(session.started_at) === key
      );
      const seconds = daySessions.reduce(
        (sum, session) =>
          sum +
          Math.max(
            0,
            Number(session.actual_seconds) || 0
          ),
        0
      );
      result.push({
        key,
        date,
        label: date.toLocaleDateString(
          "ar-EG",
          {
            weekday: "short",
          }
        ),
        seconds,
        minutes: Math.round(seconds / 60),
        sessions: daySessions.length,
      });
    }
    return result;
  }, [validSessions]);
  /* =====================================================
     WEEKLY MAX
  ===================================================== */
  const weeklyMax = useMemo(() => {
    return Math.max(
      1,
      ...weeklyData.map(
        (item) => item.seconds
      )
    );
  }, [weeklyData]);
  /* =====================================================
     STREAK
  ===================================================== */
  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = getDateKey(date);
      const hasFocus = sessions.some(
        (session) =>
          session.session_type === "focus" &&
          session.status === "completed" &&
          getDateKey(session.started_at) === key
      );
      if (hasFocus) {
        count++;
      } else {
        if (i === 0) {
          continue;
        }
        break;
      }
    }
    return count;
  }, [sessions]);
  /* =====================================================
     BEST SESSION
  ===================================================== */
  const bestSession = useMemo(() => {
    if (validSessions.length === 0) {
      return null;
    }
    return [...validSessions].sort(
      (a, b) =>
        Number(b.actual_seconds) -
        Number(a.actual_seconds)
    )[0];
  }, [validSessions]);
  /* =====================================================
     MAX DISTRIBUTION
  ===================================================== */
  const distributionTotal = useMemo(() => {
    return finalDistribution.reduce(
      (sum, item) => sum + item.seconds,
      0
    );
  }, [finalDistribution]);
  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <main className="focus-statistics-page">
      <div className="focus-statistics-container">
        <Header />
        {/* =================================================
            PERIOD FILTER
        ================================================= */}
        <section className="focus-statistics-period">
          <div className="focus-statistics-period-title">
            <FaCalendarAlt />
            <span>الفترة الزمنية</span>
          </div>
          <div className="focus-statistics-period-buttons">
            <button
              className={period === "today" ? "active" : ""}
              onClick={() => setPeriod("today")}
            >
              اليوم
            </button>
            <button
              className={period === "7days" ? "active" : ""}
              onClick={() => setPeriod("7days")}
            >
              آخر 7 أيام
            </button>
            <button
              className={period === "30days" ? "active" : ""}
              onClick={() => setPeriod("30days")}
            >
              آخر 30 يوم
            </button>
            <button
              className={period === "all" ? "active" : ""}
              onClick={() => setPeriod("all")}
            >
              كل الوقت
            </button>
          </div>
        </section>
        {/* =================================================
            ERROR
        ================================================= */}
        {error && (
          <div className="focus-statistics-error">
            <FaTimesCircle />
            <span>{error}</span>
            <button onClick={() => fetchSessions()}>
              إعادة المحاولة
            </button>
          </div>
        )}
        {/* =================================================
            LOADING
        ================================================= */}
        {loading ? (
          <div className="focus-statistics-loading">
            <div className="focus-statistics-loader" />
            <strong>جاري تحميل إحصائيات التركيز...</strong>
            <span>لحظات ونجهز لك تقريرك</span>
          </div>
        ) : (
          <>
            {/* =============================================
                MAIN STATS
            ============================================= */}
            <section className="focus-statistics-main-stats">
              <div className="focus-statistics-stat-card primary">
                <div className="focus-statistics-stat-icon">
                  <FaBrain />
                </div>
                <div>
                  <span>إجمالي وقت التركيز</span>
                  <strong>{formatDuration(totalFocusSeconds)}</strong>
                  <small>خلال الفترة المحددة</small>
                </div>
              </div>
              <div className="focus-statistics-stat-card">
                <div className="focus-statistics-stat-icon">
                  <FaCheckCircle />
                </div>
                <div>
                  <span>الجلسات المكتملة</span>
                  <strong>{completedSessions.length}</strong>
                  <small>جلسة تركيز مكتملة</small>
                </div>
              </div>
              <div className="focus-statistics-stat-card">
                <div className="focus-statistics-stat-icon">
                  <FaHourglassHalf />
                </div>
                <div>
                  <span>متوسط الجلسة</span>
                  <strong>{formatDuration(averageSessionSeconds)}</strong>
                  <small>متوسط وقت التركيز</small>
                </div>
              </div>
              <div className="focus-statistics-stat-card">
                <div className="focus-statistics-stat-icon">
                  <FaBullseye />
                </div>
                <div>
                  <span>تحقيق الأهداف</span>
                  <strong>{goalStats.achievement}%</strong>
                  <small>من الجلسات التي تم تقييمها</small>
                </div>
              </div>
            </section>
            {/* =============================================
                SECONDARY STATS
            ============================================= */}
            <section className="focus-statistics-secondary-stats">
              <div className="focus-statistics-small-card">
                <FaFire />
                <div>
                  <strong>{streak}</strong>
                  <span>يوم متتالي</span>
                </div>
              </div>
              <div className="focus-statistics-small-card">
                <FaCalendarAlt />
                <div>
                  <strong>
                    {
                      todaySessions.filter(
                        (session) =>
                          session.session_type ===
                          "focus"
                      ).length
                    }
                  </strong>
                  <span>جلسات اليوم</span>
                </div>
              </div>
              <div className="focus-statistics-small-card">
                <FaTrophy />
                <div>
                  <strong>
                    {bestSession
                      ? formatDuration(
                          Number(
                            bestSession.actual_seconds
                          ) || 0
                        )
                      : "0 ث"}
                  </strong>
                  <span>أطول جلسة</span>
                </div>
              </div>
              <div className="focus-statistics-small-card">
                <FaBullseye />
                <div>
                  <strong>{goalStats.yes}</strong>
                  <span>أهداف مكتملة</span>
                </div>
              </div>
            </section>
            {/* =============================================
                CHARTS GRID
            ============================================= */}
            <section className="focus-statistics-charts-grid">
              {/* ===========================================
                  WEEKLY CHART
              =========================================== */}
              <div className="focus-statistics-box weekly-chart-box">
                <div className="focus-statistics-box-header">
                  <div>
                    <h2>نشاط التركيز</h2>
                    <span>وقت التركيز خلال آخر 7 أيام</span>
                  </div>
                  <FaChartBar />
                </div>
                <div className="focus-statistics-weekly-chart">
                  {weeklyData.map((item) => {
                    const height =
                      item.seconds > 0
                        ? Math.max(
                            5,
                            Math.round(
                              (item.seconds /
                                weeklyMax) *
                                100
                            )
                          )
                        : 3;
                    return (
                      <div
                        className="focus-statistics-day"
                        key={item.key}
                      >
                        <span className="focus-statistics-day-value">
                          {item.seconds > 0
                            ? formatDuration(
                                item.seconds
                              )
                            : ""}
                        </span>
                        <div className="focus-statistics-day-bar-wrapper">
                          <div
                            className={`focus-statistics-day-bar ${
                              item.seconds > 0
                                ? "has-value"
                                : ""
                            }`}
                            style={{
                              height: `${height}%`,
                            }}
                          />
                        </div>
                        <strong>{item.label}</strong>
                        <small>{item.sessions} جلسة</small>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* ===========================================
                  GOALS
              =========================================== */}
              <div className="focus-statistics-box goals-box">
                <div className="focus-statistics-box-header">
                  <div>
                    <h2>تحقيق أهداف الجلسات</h2>
                    <span>مدى نجاحك في تنفيذ أهدافك</span>
                  </div>
                  <FaBullseye />
                </div>
                <div className="focus-statistics-goals-circle">
                  <svg viewBox="0 0 180 180">
                    <circle
                      cx="90"
                      cy="90"
                      r="70"
                      className="focus-statistics-goals-track"
                    />
                    <circle
                      cx="90"
                      cy="90"
                      r="70"
                      className="focus-statistics-goals-progress"
                      style={{
                        strokeDasharray:
                          2 * Math.PI * 70,
                        strokeDashoffset:
                          2 * Math.PI * 70 -
                          (goalStats.achievement /
                            100) *
                            2 *
                            Math.PI *
                            70,
                      }}
                    />
                  </svg>
                  <div>
                    <strong>{goalStats.achievement}%</strong>
                    <span>نسبة الإنجاز</span>
                  </div>
                </div>
                <div className="focus-statistics-goal-summary">
                  <div>
                    <span className="yes-dot" />
                    <strong>نعم</strong>
                    <b>{goalStats.yes}</b>
                  </div>
                  <div>
                    <span className="partial-dot" />
                    <strong>جزئياً</strong>
                    <b>{goalStats.partial}</b>
                  </div>
                  <div>
                    <span className="no-dot" />
                    <strong>لا</strong>
                    <b>{goalStats.no}</b>
                  </div>
                </div>
              </div>
            </section>
            {/* =============================================
                SUBJECT DISTRIBUTION
            ============================================= */}
            <section className="focus-statistics-box focus-statistics-distribution-box">
              <div className="focus-statistics-box-header">
                <div>
                  <h2>توزيع وقت التركيز على المواد</h2>
                  <span>كيف وزعت وقت مذاكرتك؟</span>
                </div>
                <FaChartPie />
              </div>
              {finalDistribution.length === 0 ? (
                <div className="focus-statistics-empty">
                  <FaBookOpen />
                  <strong>لا توجد بيانات مواد حتى الآن</strong>
                  <span>
                    ابدأ جلسة تركيز مرتبطة بمادة
                    وستظهر الإحصائيات هنا.
                  </span>
                </div>
              ) : (
                <div className="focus-statistics-distribution">
                  <div className="focus-statistics-distribution-circle">
                    <div className="focus-statistics-donut">
                      {finalDistribution.map(
                        (item, index) => {
                          const radius = 78;
                          const circumference =
                            2 *
                            Math.PI *
                            radius;
                          const dash =
                            (item.percentage /
                              100) *
                            circumference;
                          let previous = 0;
                          for (
                            let i = 0;
                            i < index;
                            i++
                          ) {
                            previous +=
                              finalDistribution[
                                i
                              ].percentage;
                          }
                          const offset =
                            -(
                              previous /
                              100
                            ) *
                            circumference;
                          return (
                            <svg
                              key={item.subject}
                              viewBox="0 0 200 200"
                              className="focus-statistics-donut-svg"
                            >
                              <circle
                                cx="100"
                                cy="100"
                                r={radius}
                                className={`focus-statistics-donut-segment segment-${index % 5}`}
                                strokeDasharray={`${dash} ${circumference}`}
                                strokeDashoffset={offset}
                              />
                            </svg>
                          );
                        }
                      )}
                      <div className="focus-statistics-donut-center">
                        <strong>{formatDuration(distributionTotal)}</strong>
                        <span>إجمالي التركيز</span>
                      </div>
                    </div>
                  </div>
                  <div className="focus-statistics-distribution-list">
                    {finalDistribution.map(
                      (item, index) => (
                        <div
                          className="focus-statistics-distribution-item"
                          key={item.subject}
                        >
                          <div className="focus-statistics-distribution-name">
                            <span
                              className={`focus-statistics-distribution-dot segment-${index % 5}`}
                            />
                            <strong>{item.subject}</strong>
                          </div>
                          <div className="focus-statistics-distribution-value">
                            <strong>{formatDuration(item.seconds)}</strong>
                            <span>{item.percentage}%</span>
                          </div>
                          <div className="focus-statistics-distribution-progress">
                            <div
                              className={`segment-${index % 5}`}
                              style={{
                                width: `${item.percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </section>
            {/* =============================================
                RECENT SESSIONS
            ============================================= */}
            <section className="focus-statistics-box recent-sessions-box">
              <div className="focus-statistics-box-header">
                <div>
                  <h2>آخر جلسات التركيز</h2>
                  <span>أحدث جلساتك خلال الفترة المحددة</span>
                </div>
                <FaClock />
              </div>
              {sessions.length === 0 ? (
                <div className="focus-statistics-empty">
                  <FaClock />
                  <strong>لا توجد جلسات حتى الآن</strong>
                  <span>ابدأ أول جلسة تركيز لتظهر هنا.</span>
                  <button onClick={() => navigate("/FocusSession")}>
                    <FaPlay />
                    ابدأ جلسة تركيز
                  </button>
                </div>
              ) : (
                <div className="focus-statistics-sessions-list">
                  {sessions
                    .slice(0, 10)
                    .map((session) => (
                      <div
                        className="focus-statistics-session-row"
                        key={session.id}
                      >
                        <div
                          className={`focus-statistics-session-status ${session.status}`}
                        >
                          {getStatusIcon(
                            session.status
                          )}
                        </div>
                        <div className="focus-statistics-session-info">
                          <strong>
                            {subjectNames[
                              String(
                                session.subject_id
                              )
                            ] ||
                              "جلسة تركيز"}
                          </strong>
                          <span>
                            {session.goal_type ===
                            "study"
                              ? "مذاكرة درس"
                              : session.goal_type ===
                                "review"
                                ? "مراجعة درس"
                                : session.goal_type ===
                                  "questions"
                                  ? "حل أسئلة"
                                  : "جلسة تركيز"}
                          </span>
                        </div>
                        <div className="focus-statistics-session-result">
                          {session.goal_result && (
                            <span
                              className={`focus-statistics-result ${getGoalResultClass(
                                session.goal_result
                              )}`}
                            >
                              {getGoalResultText(
                                session.goal_result
                              )}
                            </span>
                          )}
                        </div>
                        <div className="focus-statistics-session-duration">
                          <strong>
                            {formatDuration(
                              Number(
                                session.actual_seconds
                              ) || 0
                            )}
                          </strong>
                          <span>
                            {getStatusText(
                              session.status
                            )}
                          </span>
                        </div>
                        <div className="focus-statistics-session-date">
                          <strong>
                            {formatTime(
                              session.started_at
                            )}
                          </strong>
                          <span>
                            {formatDate(
                              session.started_at
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {sessions.length > 10 && (
                <button
                  className="focus-statistics-view-more"
                  onClick={() =>
                    navigate(
                      "/FocusSession"
                    )
                  }
                >
                  العودة لجلسة التركيز
                  <FaArrowRight />
                </button>
              )}
            </section>
            {/* =============================================
                PERFORMANCE SUMMARY
            ============================================= */}
            <section className="focus-statistics-summary-grid">
              <div className="focus-statistics-summary-card">
                <div className="focus-statistics-summary-icon">
                  <FaBrain />
                </div>
                <div>
                  <h3>أداء التركيز</h3>
                  <p>
                    لديك{" "}
                    <strong>
                      {completedSessions.length}
                    </strong>{" "}
                    جلسة مكتملة بإجمالي{" "}
                    <strong>
                      {formatDuration(
                        totalFocusSeconds
                      )}
                    </strong>{" "}
                    من التركيز.
                  </p>
                </div>
              </div>
              <div className="focus-statistics-summary-card">
                <div className="focus-statistics-summary-icon">
                  <FaBullseye />
                </div>
                <div>
                  <h3>تحقيق الأهداف</h3>
                  <p>
                    حققت أهداف{" "}
                    <strong>{goalStats.yes}</strong>{" "}
                    جلسات بشكل كامل، و{" "}
                    <strong>{goalStats.partial}</strong>{" "}
                    بشكل جزئي.
                  </p>
                </div>
              </div>
              <div className="focus-statistics-summary-card">
                <div className="focus-statistics-summary-icon">
                  <FaTrophy />
                </div>
                <div>
                  <h3>أفضل جلسة</h3>
                  <p>
                    {bestSession
                      ? `أطول جلسة تركيز كانت ${formatDuration(
                          Number(
                            bestSession.actual_seconds
                          ) || 0
                        )}.`
                      : "ابدأ جلسة تركيز لتحديد أفضل جلسة لك."}
                  </p>
                </div>
              </div>
            </section>
            {/* =============================================
                CTA
            ============================================= */}
            <section className="focus-statistics-cta">
              <div>
                <FaBrain />
                <div>
                  <h2>جاهز لجلسة جديدة؟</h2>
                  <p>
                    حافظ على تركيزك واستمر في بناء
                    عادتك اليومية.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  navigate(
                    "/FocusSession"
                  )
                }
              >
                <FaPlay />
                ابدأ جلسة تركيز
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
};
export default FocusStatistics;