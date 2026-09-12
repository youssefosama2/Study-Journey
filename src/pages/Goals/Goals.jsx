import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiTarget,
  FiTrendingUp,
  FiCalendar,
  FiEdit3,
  FiPlus,
  FiArrowUp,
  FiAward,
  FiBookOpen,
  FiClock,
  FiBarChart2,
  FiCheckCircle,
  FiAlertCircle,
  FiZap,
  FiChevronLeft,
  FiActivity,
  FiRefreshCw,
} from "react-icons/fi";
import Header from "../../components/Header/Header";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../utils/supabaseClient";
import Swal from "sweetalert2";
import "./Goals.css";
/* =========================================================
   ثابت بداية الامتحانات
========================================================= */
const EXAM_START_DATE = "2027-06-26";
/* =========================================================
   Helpers
========================================================= */
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
const getDaysRemaining = (dateString) => {
  if (!dateString) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateString}T00:00:00`);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};
const getGoalStatus = (progress, target) => {
  if (progress === null) {
    return {
      label: "لم تبدأ بعد",
      type: "neutral",
    };
  }
  if (progress >= target) {
    return {
      label: "حققت هدفك 🎉",
      type: "success",
    };
  }
  if (progress >= target - 5) {
    return {
      label: "قريب جدًا من الهدف",
      type: "warning",
    };
  }
  if (progress >= target - 15) {
    return {
      label: "تقدم جيد",
      type: "info",
    };
  }
  return {
    label: "يحتاج إلى تركيز",
    type: "danger",
  };
};
const getPriority = (percentage) => {
  if (percentage < 60) return "عالية";
  if (percentage < 75) return "متوسطة";
  return "منخفضة";
};
const getSubjectMessage = (percentage) => {
  if (percentage >= 90) return "ممتاز جدًا، حافظ على مستواك";
  if (percentage >= 80) return "مستوى جيد جدًا";
  if (percentage >= 70) return "جيد، ويمكن رفع المستوى";
  if (percentage >= 60) return "يحتاج إلى مراجعة";
  return "يحتاج إلى تركيز أكبر";
};
/* =========================================================
   Component
========================================================= */
const Goals = () => {
  const { darkMode } = useTheme();
  const [user, setUser] = useState(null);
  const [goal, setGoal] = useState(null);
  const [studyResults, setStudyResults] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [formData, setFormData] = useState({
    title: "الحصول على 95% في الثانوية العامة",
    target: 95,
    description: "هدفي الأساسي لهذا العام الدراسي",
  });
  /* =========================================================
     Fetch Data
  ========================================================= */
  const fetchGoalsData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) {
        throw authError;
      }
      if (!currentUser) {
        throw new Error("لم يتم العثور على المستخدم");
      }
      setUser(currentUser);
      /* =========================================
         Fetch Goal
      ========================================= */
      const {
        data: goalData,
        error: goalError,
      } = await supabase
        .from("study_goals")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("goal_type", "yearly")
        .order("created_at", { ascending: false })
        .limit(1);
      if (goalError) {
        throw goalError;
      }
      const currentGoal = goalData?.[0] || null;
      setGoal(currentGoal);
      /* =========================================
         Fetch Exam Results
      ========================================= */
      const {
        data: resultsData,
        error: resultsError,
      } = await supabase
        .from("student_lesson_study")
        .select(`
          id,
          user_id,
          subject_id,
          unit_id,
          lesson_id,
          studied_at,
          score,
          exam_total,
          created_at
        `)
        .eq("user_id", currentUser.id)
        .not("score", "is", null)
        .not("exam_total", "is", null)
        .order("created_at", { ascending: false });
      if (resultsError) {
        throw resultsError;
      }
      /*
        ممكن يكون عندنا أكثر من سجل لنفس الدرس.
        نستخدم أحدث نتيجة فقط.
      */
      const latestResultsMap = new Map();
      (resultsData || []).forEach((item) => {
        if (
          item.score === null ||
          item.exam_total === null ||
          Number(item.exam_total) <= 0
        ) {
          return;
        }
        if (!latestResultsMap.has(item.lesson_id)) {
          latestResultsMap.set(item.lesson_id, item);
        }
      });
      const latestResults = Array.from(latestResultsMap.values());
      setStudyResults(latestResults);
      /* =========================================
         Fetch Subjects
      ========================================= */
      const {
        data: subjectsData,
        error: subjectsError,
      } = await supabase
        .from("subjects")
        .select("id, name")
        .order("name", { ascending: true });
      if (subjectsError) {
        throw subjectsError;
      }
      setSubjects(subjectsData || []);
    } catch (err) {
      console.error("Goals fetch error:", err);
      setError(
        err?.message ||
          "حدث خطأ أثناء تحميل بيانات الأهداف"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    fetchGoalsData();
  }, [fetchGoalsData]);
  /* =========================================================
     Calculations
  ========================================================= */
  const currentProgress = useMemo(() => {
    if (!studyResults.length) {
      return null;
    }
    let totalPercentage = 0;
    studyResults.forEach((result) => {
      const score = Number(result.score);
      const total = Number(result.exam_total);
      if (total > 0) {
        const percentage = (score / total) * 100;
        totalPercentage += Math.min(
          100,
          Math.max(0, percentage)
        );
      }
    });
    return Number(
      (totalPercentage / studyResults.length).toFixed(1)
    );
  }, [studyResults]);
  const target = useMemo(() => {
    if (!goal) return 95;
    return Math.min(
      100,
      Math.max(1, Number(goal.target_value || 95))
    );
  }, [goal]);
  const remaining = useMemo(() => {
    if (currentProgress === null) {
      return target;
    }
    return Number(
      Math.max(0, target - currentProgress).toFixed(1)
    );
  }, [currentProgress, target]);
  const daysRemaining = useMemo(() => {
    return getDaysRemaining(EXAM_START_DATE);
  }, []);
  const goalStatus = useMemo(() => {
    return getGoalStatus(currentProgress, target);
  }, [currentProgress, target]);
  /* =========================================================
     Subject Analysis
  ========================================================= */
  const subjectAnalysis = useMemo(() => {
    const map = new Map();
    studyResults.forEach((result) => {
      if (!result.subject_id) return;
      const score = Number(result.score);
      const total = Number(result.exam_total);
      if (!total || total <= 0) return;
      const percentage = Math.min(
        100,
        Math.max(0, (score / total) * 100)
      );
      if (!map.has(result.subject_id)) {
        map.set(result.subject_id, {
          subjectId: result.subject_id,
          percentages: [],
          lessons: 0,
        });
      }
      const item = map.get(result.subject_id);
      item.percentages.push(percentage);
      item.lessons += 1;
    });
    return Array.from(map.values())
      .map((item) => {
        const subject = subjects.find(
          (s) => s.id === item.subjectId
        );
        const percentage =
          item.percentages.length > 0
            ? item.percentages.reduce(
                (sum, value) => sum + value,
                0
              ) / item.percentages.length
            : 0;
        return {
          ...item,
          name: subject?.name || "مادة غير معروفة",
          percentage: Number(percentage.toFixed(1)),
          priority: getPriority(percentage),
          message: getSubjectMessage(percentage),
        };
      })
      .sort((a, b) => a.percentage - b.percentage);
  }, [studyResults, subjects]);
  /* =========================================================
     Smart Plan
  ========================================================= */
  const smartPlan = useMemo(() => {
    if (!subjectAnalysis.length) {
      return [
        {
          icon: <FiBookOpen />,
          title: "ابدأ بتسجيل نتائج امتحاناتك",
          description:
            "بعد تسجيل نتائج الامتحانات ستظهر لك خطة مخصصة حسب مستواك في كل مادة.",
        },
        {
          icon: <FiActivity />,
          title: "تابع تقدمك باستمرار",
          description:
            "كل نتيجة جديدة ستساعدك على معرفة مستواك الحقيقي.",
        },
      ];
    }
    const weakest = subjectAnalysis.slice(0, 3);
    const plan = [];
    weakest.forEach((subject, index) => {
      plan.push({
        icon:
          index === 0 ? (
            <FiAlertCircle />
          ) : (
            <FiBookOpen />
          ),
        title:
          index === 0
            ? `ركز أولًا على ${subject.name}`
            : `راجع ${subject.name}`,
        description:
          subject.percentage < 60
            ? `مستواك الحالي ${subject.percentage}%، وتحتاج المادة إلى مراجعة قوية وحل المزيد من الاختبارات.`
            : subject.percentage < 75
            ? `مستواك ${subject.percentage}%، ركز على نقاط الضعف وحل تدريبات إضافية.`
            : `مستواك ${subject.percentage}%، راجع الأخطاء وحافظ على مستواك.`,
      });
    });
    plan.push({
      icon: <FiRefreshCw />,
      title: "اختبر نفسك باستمرار",
      description:
        "لا تعتمد على المذاكرة فقط، وسجل نتائج الاختبارات لمعرفة هل مستواك يتحسن أم لا.",
    });
    return plan;
  }, [subjectAnalysis]);
  /* =========================================================
     Open Create Modal
  ========================================================= */
  const openCreateModal = () => {
    setFormData({
      title: "الحصول على 95% في الثانوية العامة",
      target: 95,
      description: "هدفي الأساسي لهذا العام الدراسي",
    });
    setShowModal(true);
  };
  /* =========================================================
     Open Edit Modal
  ========================================================= */
  const openEditModal = () => {
    if (!goal) return;
    setFormData({
      title:
        goal.title ||
        "الحصول على 95% في الثانوية العامة",
      target: Number(goal.target_value || 95),
      description:
        goal.description ||
        "هدفي الأساسي لهذا العام الدراسي",
    });
    setShowModal(true);
  };
  /* =========================================================
     Handle Form
  ========================================================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "target"
          ? value.replace(/[^\d.]/g, "")
          : value,
    }));
  };
  /* =========================================================
     Save Goal
  ========================================================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const cleanTarget = Number(formData.target);
    if (
      !cleanTarget ||
      cleanTarget < 1 ||
      cleanTarget > 100
    ) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "أدخل هدفًا صحيحًا من 1 إلى 100",
        showConfirmButton: false,
        timer: 3000,
      });
      return;
    }
    try {
      setSaving(true);
      const goalPayload = {
        user_id: user.id,
        goal_type: "yearly",
        title:
          formData.title.trim() ||
          `الحصول على ${cleanTarget}% في الثانوية العامة`,
        description:
          formData.description.trim() ||
          "هدفي الأساسي لهذا العام الدراسي",
        due_date: EXAM_START_DATE,
        target_value: cleanTarget,
        current_value:
          currentProgress !== null
            ? currentProgress
            : 0,
        subject_id: null,
        unit_id: null,
        lesson_id: null,
        is_completed:
          currentProgress !== null &&
          currentProgress >= cleanTarget,
        completed_at:
          currentProgress !== null &&
          currentProgress >= cleanTarget
            ? new Date().toISOString()
            : null,
        updated_at: new Date().toISOString(),
      };
      if (goal?.id) {
        const { error: updateError } = await supabase
          .from("study_goals")
          .update({
            title: goalPayload.title,
            description: goalPayload.description,
            due_date: EXAM_START_DATE,
            target_value: goalPayload.target_value,
            current_value: goalPayload.current_value,
            is_completed: goalPayload.is_completed,
            completed_at: goalPayload.completed_at,
            updated_at: goalPayload.updated_at,
          })
          .eq("id", goal.id)
          .eq("user_id", user.id);
        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from("study_goals")
          .insert(goalPayload);
        if (insertError) {
          throw insertError;
        }
      }
      setShowModal(false);
      await fetchGoalsData();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: goal
          ? "تم تحديث هدفك بنجاح"
          : "تم إنشاء هدفك السنوي بنجاح",
        showConfirmButton: false,
        timer: 3000,
      });
    } catch (err) {
      console.error("Save goal error:", err);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title:
          err?.message ||
          "حدث خطأ أثناء حفظ الهدف",
        showConfirmButton: false,
        timer: 3500,
      });
    } finally {
      setSaving(false);
    }
  };
  /* =========================================================
     Sync current progress to DB
  ========================================================= */
  useEffect(() => {
    if (!goal?.id || currentProgress === null) {
      return;
    }
    const calculatedCompleted =
      currentProgress >= target;
    const calculatedCompletedAt =
      calculatedCompleted
        ? goal.completed_at ||
          new Date().toISOString()
        : null;
    const needsUpdate =
      Number(goal.current_value || 0) !==
        Number(currentProgress) ||
      Boolean(goal.is_completed) !==
        calculatedCompleted;
    if (!needsUpdate) return;
    const syncProgress = async () => {
      try {
        const { error: syncError } = await supabase
          .from("study_goals")
          .update({
            current_value: currentProgress,
            is_completed: calculatedCompleted,
            completed_at: calculatedCompletedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", goal.id)
          .eq("user_id", user?.id);
        if (syncError) {
          console.error(
            "Goal progress sync error:",
            syncError
          );
        }
      } catch (err) {
        console.error(
          "Goal progress sync exception:",
          err
        );
      }
    };
    syncProgress();
  }, [
    goal?.id,
    goal?.current_value,
    goal?.is_completed,
    goal?.completed_at,
    currentProgress,
    target,
    user?.id,
  ]);
  /* =========================================================
     Loading
  ========================================================= */
  if (loading) {
    return (
      <main className={`goals-page ${darkMode ? "dark-mode" : ""}`} dir="rtl">
        <Header />
        <div className="page-loading">
          <div className="page-loading-spinner">
            <FiRefreshCw />
          </div>
          <h3>جاري تجهيز أهدافك...</h3>
          <p>بنحمّل أهدافك وتقدمك والبيانات الخاصة بخطتك.</p>
        </div>
      </main>
    );
  }
  /* =========================================================
     Error
  ========================================================= */
  if (error) {
    return (
      <div
        className={`goals-page ${
          darkMode ? "dark-mode" : ""
        }`}
        dir="rtl"
      >
        <div className="goals-container">
          <Header />
          <div className="goals-error">
            <FiAlertCircle />
            <h3>حدث خطأ</h3>
            <p>{error}</p>
            <button
              className="primary-btn"
              onClick={() => fetchGoalsData()}
            >
              <FiRefreshCw />
              المحاولة مرة أخرى
            </button>
          </div>
        </div>
      </div>
    );
  }
  /* =========================================================
     Empty Goal
  ========================================================= */
  if (!goal) {
    return (
      <div
        className={`goals-page ${
          darkMode ? "dark-mode" : ""
        }`}
        dir="rtl"
      >
        <main className="goals-container">
          <Header />
          <section className="goals-hero">
            <div className="hero-content">
              <div className="hero-badge">
                <FiTarget />
                هدفك السنوي
              </div>
              <h1>
                حدد هدفك الدراسي
                <span> لهذا العام</span>
              </h1>
              <p>
                حدد النسبة التي تريد الوصول إليها،
                وسنحسب تقدمك تلقائيًا من نتائج
                امتحاناتك.
              </p>
            </div>
          </section>
          <section className="empty-goal-card">
            <div className="empty-goal-icon">
              <FiTarget />
            </div>
            <h2>ليس لديك هدف سنوي حتى الآن</h2>
            <p>
              أنشئ هدفك الدراسي وحدد النسبة التي
              تريد الوصول إليها قبل بداية الامتحانات.
            </p>
            <div className="fixed-exam-info">
              <FiCalendar />
              <div>
                <span>بداية الامتحانات</span>
                <strong>26 يونيو 2027</strong>
              </div>
            </div>
            <button
              className="primary-btn large-btn"
              onClick={openCreateModal}
            >
              <FiPlus />
              إنشاء هدفي السنوي
            </button>
          </section>
        </main>
        {showModal && (
          <GoalModal
            darkMode={darkMode}
            formData={formData}
            saving={saving}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            onClose={() => setShowModal(false)}
            isEdit={false}
          />
        )}
      </div>
    );
  }
  /* =========================================================
     Main Page
  ========================================================= */
  return (
    <div
      className={`goals-page ${
        darkMode ? "dark-mode" : ""
      }`}
      dir="rtl"
    >
      <Header />
      <main className="goals-container">
        {/* ===============================================
            Hero
        =============================================== */}
        <section className="goals-hero">
          <div className="hero-content">
            <div className="hero-badge">
              <FiTarget />
              هدفك السنوي
            </div>
            <h1>
              هدفك الدراسي
              <span> يبدأ من هنا</span>
            </h1>
            <p>
              تابع مستواك الحقيقي واعرف بالضبط أين
              تحتاج إلى بذل المزيد من الجهد.
            </p>
          </div>
          <div className="hero-actions">
            <button
              className="secondary-btn"
              onClick={() =>
                fetchGoalsData(true)
              }
              disabled={refreshing}
            >
              <FiRefreshCw
                className={
                  refreshing
                    ? "spin-animation"
                    : ""
                }
              />
              تحديث
            </button>
            <button
              className="primary-btn"
              onClick={openEditModal}
            >
              <FiEdit3 />
              تعديل الهدف
            </button>
          </div>
        </section>
        {/* ===============================================
            Main Goal
        =============================================== */}
        <section className="main-goal-card">
          <div className="goal-card-header">
            <div>
              <span className="small-label">الهدف السنوي</span>
              <h2>
                {goal.title ||
                  `الحصول على ${target}%`}
              </h2>
              <p>
                {goal.description ||
                  "هدفي الأساسي لهذا العام الدراسي"}
              </p>
            </div>
            <div
              className={`goal-status ${goalStatus.type}`}
            >
              {goalStatus.type ===
              "success" ? (
                <FiCheckCircle />
              ) : (
                <FiActivity />
              )}
              {goalStatus.label}
            </div>
          </div>
          <div className="goal-main-grid">
            {/* Target */}
            <div className="target-box">
              <div className="target-icon">
                <FiAward />
              </div>
              <div>
                <span>الهدف</span>
                <strong>
                  {target}
                  <small>%</small>
                </strong>
              </div>
            </div>
            {/* Progress */}
            <div className="progress-section">
              <div className="progress-header">
                <div>
                  <span>مستواك الحالي</span>
                  <strong>
                    {currentProgress === null
                      ? "--"
                      : `${currentProgress}%`}
                  </strong>
                </div>
                <div className="remaining-value">
                  {currentProgress === null
                    ? `متبقي ${target}%`
                    : remaining > 0
                    ? `متبقي ${remaining}%`
                    : "تم تحقيق الهدف"}
                </div>
              </div>
              <div className="goal-progress">
                <div
                  className="goal-progress-fill"
                  style={{
                    width: `${
                      currentProgress === null
                        ? 0
                        : Math.min(
                            100,
                            (currentProgress /
                              target) *
                              100
                          )
                    }%`,
                  }}
                />
              </div>
              <div className="progress-scale">
                <span>0%</span>
                <span>هدفك {target}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
          {/* Stats */}
          <div className="goal-stats">
            <div className="goal-stat">
              <div className="stat-icon blue">
                <FiTrendingUp />
              </div>
              <div>
                <span>التقدم الحالي</span>
                <strong>
                  {currentProgress === null
                    ? "لا توجد نتائج"
                    : `${currentProgress}%`}
                </strong>
              </div>
            </div>
            <div className="goal-stat">
              <div className="stat-icon purple">
                <FiTarget />
              </div>
              <div>
                <span>المتبقي</span>
                <strong>
                  {currentProgress === null
                    ? `${target}%`
                    : `${remaining}%`}
                </strong>
              </div>
            </div>
            <div className="goal-stat">
              <div className="stat-icon orange">
                <FiCalendar />
              </div>
              <div>
                <span>أيام حتى الامتحانات</span>
                <strong>{daysRemaining}</strong>
              </div>
            </div>
            <div className="goal-stat">
              <div className="stat-icon green">
                <FiBookOpen />
              </div>
              <div>
                <span>الامتحانات المسجلة</span>
                <strong>{studyResults.length}</strong>
              </div>
            </div>
          </div>
        </section>
        {/* ===============================================
            Exam Date + Source
        =============================================== */}
        <section className="info-grid">
          <div className="info-card exam-date-card">
            <div className="info-card-icon">
              <FiCalendar />
            </div>
            <div className="info-card-content">
              <span>بداية الامتحانات</span>
              <strong>26 يونيو 2027</strong>
              <p>التاريخ ثابت ولا يحتاج إلى إدخال</p>
            </div>
          </div>
          <div className="info-card">
            <div className="info-card-icon source">
              <FiActivity />
            </div>
            <div className="info-card-content">
              <span>مصدر التقدم</span>
              <strong>نتائج امتحاناتك</strong>
              <p>
                يتم حساب النسبة تلقائيًا من نتائج
                الامتحانات المسجلة.
              </p>
            </div>
          </div>
        </section>
        {/* ===============================================
            Subject Analysis
        =============================================== */}
        <section className="section-block">
          <div className="section-heading">
            <div>
              <span className="section-kicker">تحليل المستوى</span>
              <h2>مستواك في المواد</h2>
              <p>
                نحدد المواد التي تحتاج إلى اهتمام أكبر
                بناءً على نتائجك.
              </p>
            </div>
            <div className="section-heading-icon">
              <FiBarChart2 />
            </div>
          </div>
          {!subjectAnalysis.length ? (
            <div className="no-data-card">
              <FiBarChart2 />
              <h3>لا توجد نتائج كافية للتحليل</h3>
              <p>
                سجل نتائج بعض الامتحانات حتى نتمكن
                من تحليل مستواك في كل مادة.
              </p>
            </div>
          ) : (
            <div className="subjects-analysis">
              {subjectAnalysis.map(
                (subject, index) => (
                  <div
                    className="subject-analysis-card"
                    key={subject.subjectId}
                  >
                    <div className="subject-rank">
                      {index + 1}
                    </div>
                    <div className="subject-main">
                      <div className="subject-title-row">
                        <div>
                          <h3>{subject.name}</h3>
                          <span>
                            {subject.lessons}{" "}
                            امتحان مسجل
                          </span>
                        </div>
                        <strong>{subject.percentage}%</strong>
                      </div>
                      <div className="subject-progress">
                        <div
                          className="subject-progress-fill"
                          style={{
                            width: `${subject.percentage}%`,
                          }}
                        />
                      </div>
                      <div className="subject-footer">
                        <span>{subject.message}</span>
                        <span
                          className={`priority ${subject.priority === "عالية"
                              ? "high"
                              : subject.priority ===
                                "متوسطة"
                              ? "medium"
                              : "low"
                            }`}
                        >
                          أولوية {subject.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
        {/* ===============================================
            Smart Plan
        =============================================== */}
        <section className="section-block smart-plan-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">خطة ذكية</span>
              <h2>ماذا تفعل الآن؟</h2>
              <p>اقتراحات مبنية على مستواك الحالي.</p>
            </div>
            <div className="section-heading-icon zap">
              <FiZap />
            </div>
          </div>
          <div className="smart-plan-list">
            {smartPlan.map((item, index) => (
              <div
                className="smart-plan-item"
                key={index}
              >
                <div className="plan-number">{index + 1}</div>
                <div className="plan-icon">{item.icon}</div>
                <div className="plan-content">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <FiChevronLeft className="plan-arrow" />
              </div>
            ))}
          </div>
          <button
            className="plan-toggle-btn"
            onClick={() =>
              setShowPlan(!showPlan)
            }
          >
            {showPlan
              ? "إخفاء الخطة"
              : "عرض الخطة بالتفصيل"}
            <FiChevronLeft
              className={
                showPlan
                  ? "rotate-left"
                  : ""
              }
            />
          </button>
          {showPlan && (
            <div className="plan-details">
              <div className="plan-detail-box">
                <FiClock />
                <div>
                  <strong>خصص وقتًا للمواد الأضعف</strong>
                  <p>
                    المواد ذات النسب الأقل هي
                    الأولوية الأولى في جدولك.
                  </p>
                </div>
              </div>
              <div className="plan-detail-box">
                <FiTarget />
                <div>
                  <strong>لا تركز على النسبة فقط</strong>
                  <p>
                    راقب الأخطاء المتكررة وحاول
                    فهم سبب فقدان الدرجات.
                  </p>
                </div>
              </div>
              <div className="plan-detail-box">
                <FiTrendingUp />
                <div>
                  <strong>أعد الاختبار</strong>
                  <p>
                    بعد المراجعة، اختبر نفسك مرة
                    أخرى وسجل النتيجة الجديدة.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
        {/* ===============================================
            Motivation
        =============================================== */}
        <section className="motivation-card">
          <div className="motivation-icon">
            <FiAward />
          </div>
          <div>
            <span>تذكر دائمًا</span>
            <h2>
              {currentProgress !== null &&
              currentProgress >= target
                ? "أنت وصلت لهدفك، حافظ على مستواك! 🎉"
                : remaining <= 5 &&
                  currentProgress !== null
                ? "باقي خطوة صغيرة جدًا للوصول لهدفك! 🔥"
                : "كل نتيجة جديدة تقربك أكثر من هدفك. 💪"}
            </h2>
            <p>
              استمر في المذاكرة، راقب نتائجك،
              وتعلم من أخطائك.
            </p>
          </div>
        </section>
      </main>
      {/* ===============================================
          Modal
      =============================================== */}
      {showModal && (
        <GoalModal
          darkMode={darkMode}
          formData={formData}
          saving={saving}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
          isEdit={Boolean(goal)}
        />
      )}
    </div>
  );
};
/* =========================================================
   Goal Modal
========================================================= */
const GoalModal = ({
  darkMode,
  formData,
  saving,
  handleChange,
  handleSubmit,
  onClose,
  isEdit,
}) => {
  return (
    <div
      className="goal-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`goal-modal ${
          darkMode ? "dark-mode" : ""
        }`}
        dir="rtl"
      >
        <div className="modal-header">
          <div>
            <span>الهدف السنوي</span>
            <h2>
              {isEdit
                ? "تعديل هدفك"
                : "إنشاء هدفك"}
            </h2>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label>عنوان الهدف</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="مثال: الحصول على 95% في الثانوية العامة"
            />
          </div>
          {/* Target */}
          <div className="form-group">
            <label>النسبة المستهدفة</label>
            <div className="target-input-wrapper">
              <input
                type="number"
                name="target"
                min="1"
                max="100"
                step="0.1"
                value={formData.target}
                onChange={handleChange}
                placeholder="95"
              />
              <span>%</span>
            </div>
            <small>
              حدد النسبة التي تريد الوصول إليها من
              100%.
            </small>
          </div>
          {/* Description */}
          <div className="form-group">
            <label>وصف الهدف</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="اكتب وصفًا بسيطًا لهدفك..."
            />
          </div>
          {/* Fixed Exam Date */}
          <div className="form-group">
            <label>موعد الامتحانات</label>
            <div className="fixed-exam-date">
              <FiCalendar />
              <div>
                <span>بداية الامتحانات</span>
                <strong>26 يونيو 2027</strong>
              </div>
            </div>
            <small>
              موعد الامتحانات ثابت ولا يمكن تعديله
              من الطالب.
            </small>
          </div>
          {/* Automatic Progress */}
          <div className="automatic-progress-info">
            <div className="automatic-progress-icon">
              <FiActivity />
            </div>
            <div>
              <strong>التقدم يحسب تلقائيًا</strong>
              <p>
                لن تحتاج إلى إدخال مستواك الحالي.
                سيتم حسابه من نتائج الامتحانات
                المسجلة في حسابك.
              </p>
            </div>
          </div>
          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={saving}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={saving}
            >
              {saving ? (
                <>
                  <FiRefreshCw className="spin-animation" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <FiCheckCircle />
                  {isEdit
                    ? "حفظ التعديلات"
                    : "إنشاء الهدف"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default Goals;