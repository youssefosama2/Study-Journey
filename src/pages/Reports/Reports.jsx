import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiAward,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiRefreshCw,
  FiTarget,
  FiTrendingDown,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import { supabase } from "../../utils/supabaseClient";
import { useTheme } from "../../context/ThemeContext";
import "./Reports.css";

const PERIODS = {
  week: {
    label: "هذا الأسبوع",
    days: 7,
  },
  month: {
    label: "هذا الشهر",
    days: 30,
  },
  threeMonths: {
    label: "آخر 3 شهور",
    days: 90,
  },
  year: {
    label: "هذا العام",
    days: 365,
  },
};

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const average = (values) => {
  const valid = values.map(Number).filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const formatHours = (hours) => {
  if (!hours) return "0 س";
  if (hours < 1) return `${Math.round(hours * 60)} د`;
  return `${hours.toFixed(1)} س`;
};

const formatMinutes = (minutes) => {
  if (!minutes) return "0 د";
  const value = Math.round(minutes);
  if (value < 60) return `${value} د`;
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return mins ? `${hours} س ${mins} د` : `${hours} س`;
};

const getDateFromRow = (row, fields = []) => {
  for (const field of fields) {
    if (row?.[field]) {
      const date = new Date(row[field]);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return null;
};

const dateKey = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStartDate = (days) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (days - 1));
  return date;
};

const isInsidePeriod = (rowDate, startDate, endDate) => {
  if (!rowDate) return false;
  return rowDate >= startDate && rowDate <= endDate;
};

const getSubjectColor = (index) => {
  const colors = [
    "#6366f1",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#84cc16",
  ];
  return colors[index % colors.length];
};

const getScoreClass = (score) => {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "average";
  return "weak";
};

const getPerformanceLabel = (score) => {
  if (score >= 85) return "ممتاز";
  if (score >= 70) return "جيد جدًا";
  if (score >= 50) return "متوسط";
  return "يحتاج تحسين";
};

const normalizeMemoryScore = (value) => {
  const score = safeNumber(value);
  if (!score) return 0;

  // بعض الأنظمة تخزن الذاكرة من 0 إلى 1
  if (score <= 1) return score * 100;

  return score > 100 ? 100 : score;
};

const AppTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="reports-tooltip">
      {label && <div className="tooltip-label">{label}</div>}
      {payload.map((item, index) => (
        <div className="tooltip-row" key={`${item.name}-${index}`}>
          <span>{item.name}</span>
          <strong>
            {typeof item.value === "number"
              ? Number.isInteger(item.value)
                ? item.value
                : item.value.toFixed(1)
              : item.value}
          </strong>
        </div>
      ))}
    </div>
  );
};

export default function Reports() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [data, setData] = useState({
    studies: [],
    focusSessions: [],
    tasks: [],
    plans: [],
    reviews: [],
    lessonReviews: [],
    errors: [],
    subjects: [],
    units: [],
    subjectUnits: [],
    lessons: [],
    subjectLessons: [],
  });

  const loadReports = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      const user = authData?.user;

      if (!user) {
        throw new Error("لم يتم العثور على المستخدم الحالي");
      }

      setCurrentUser(user);

      const results = await Promise.all([
        supabase.from("student_lesson_study").select("*").eq("user_id", user.id),
        supabase.from("study_focus_sessions").select("*").eq("user_id", user.id),
        supabase.from("study_tasks").select("*").eq("user_id", user.id),
        supabase.from("study_plans").select("*").eq("user_id", user.id),
        supabase.from("study_reviews").select("*").eq("user_id", user.id),
        supabase.from("student_lesson_reviews").select("*").eq("user_id", user.id),
        supabase.from("study_errors").select("*").eq("user_id", user.id),
        supabase.from("subjects").select("*").eq("is_active", true),
        supabase.from("units").select("*").eq("is_active", true),
        supabase.from("subject_units").select("*").eq("is_active", true),
        supabase.from("lessons").select("*").eq("is_active", true),
        supabase.from("subject_lessons").select("*").eq("is_active", true),
      ]);

      const [
        studiesResult,
        focusResult,
        tasksResult,
        plansResult,
        reviewsResult,
        lessonReviewsResult,
        errorsResult,
        subjectsResult,
        unitsResult,
        subjectUnitsResult,
        lessonsResult,
        subjectLessonsResult,
      ] = results;

      const firstError = results.find((result) => result.error);

      if (firstError?.error) {
        console.error("Reports Supabase error:", firstError.error);
        throw firstError.error;
      }

      setData({
        studies: studiesResult.data || [],
        focusSessions: focusResult.data || [],
        tasks: tasksResult.data || [],
        plans: plansResult.data || [],
        reviews: reviewsResult.data || [],
        lessonReviews: lessonReviewsResult.data || [],
        errors: errorsResult.data || [],
        subjects: subjectsResult.data || [],
        units: unitsResult.data || [],
        subjectUnits: subjectUnitsResult.data || [],
        lessons: lessonsResult.data || [],
        subjectLessons: subjectLessonsResult.data || [],
      });
    } catch (err) {
      console.error("Reports load error:", err);
      setError(err?.message || "حدث خطأ أثناء تحميل التقارير من قاعدة البيانات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const periodInfo = PERIODS[period];

  const startDate = useMemo(
    () => getStartDate(periodInfo.days),
    [periodInfo.days]
  );

  const endDate = useMemo(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  }, [period]);

  const subjectMap = useMemo(
    () => new Map(data.subjects.map((subject) => [subject.id, subject])),
    [data.subjects]
  );

  const unitMap = useMemo(
    () => new Map(data.units.map((unit) => [unit.id, unit])),
    [data.units]
  );

  const subjectUnitMap = useMemo(
    () => new Map(data.subjectUnits.map((unit) => [unit.id, unit])),
    [data.subjectUnits]
  );

  const lessonMap = useMemo(
    () => new Map(data.lessons.map((lesson) => [lesson.id, lesson])),
    [data.lessons]
  );

  const subjectLessonMap = useMemo(
    () => new Map(data.subjectLessons.map((lesson) => [lesson.id, lesson])),
    [data.subjectLessons]
  );

  const resolveSubjectId = useCallback(
    (row) => {
      if (!row) return null;

      // 1 — subject_id مباشر
      if (row.subject_id && subjectMap.has(row.subject_id)) {
        return row.subject_id;
      }

      // 2 — من خلال unit_id
      if (row.unit_id) {
        const unit = unitMap.get(row.unit_id) || subjectUnitMap.get(row.unit_id);

        if (unit?.subject_id) {
          return unit.subject_id;
        }
      }

      // 3 — من خلال lesson_id
      if (row.lesson_id) {
        const lesson = lessonMap.get(row.lesson_id) || subjectLessonMap.get(row.lesson_id);

        if (lesson?.unit_id) {
          const unit = unitMap.get(lesson.unit_id) || subjectUnitMap.get(lesson.unit_id);

          if (unit?.subject_id) {
            return unit.subject_id;
          }
        }
      }

      return null;
    },
    [
      subjectMap,
      unitMap,
      subjectUnitMap,
      lessonMap,
      subjectLessonMap,
    ]
  );

  const periodData = useMemo(() => {
    const filterRows = (rows, fields) =>
      rows.filter((row) =>
        isInsidePeriod(
          getDateFromRow(row, fields),
          startDate,
          endDate
        )
      );

    return {
      studies: filterRows(data.studies, ["studied_at", "created_at"]),
      focusSessions: filterRows(data.focusSessions, ["started_at", "created_at", "updated_at"]),
      tasks: filterRows(data.tasks, ["completed_at", "created_at", "due_date", "plan_date"]),
      plans: filterRows(data.plans, ["plan_date", "created_at"]),
      reviews: filterRows(data.reviews, ["reviewed_at", "scheduled_for", "created_at"]),
      lessonReviews: filterRows(data.lessonReviews, ["completed_at", "scheduled_at", "created_at"]),
      errors: filterRows(data.errors, ["last_occurred_at", "created_at", "updated_at"]),
    };
  }, [data, startDate, endDate]);

  const subjectStats = useMemo(() => {
    const stats = new Map();

    const ensureSubject = (subjectId) => {
      if (!subjectId) return null;

      if (!stats.has(subjectId)) {
        const subject = subjectMap.get(subjectId);

        stats.set(subjectId, {
          id: subjectId,
          name: subject?.name || "مادة غير معروفة",
          subtitle: subject?.subtitle || "",
          studyMinutes: 0,
          studyCount: 0,
          studiedLessons: new Set(),
          focusSeconds: 0,
          focusCount: 0,
          scores: [],
          tasksTotal: 0,
          tasksCompleted: 0,
          reviewsTotal: 0,
          reviewsCompleted: 0,
          memoryScores: [],
          errorsTotal: 0,
          errorsCorrected: 0,
          plannedMinutes: 0,
        });
      }

      return stats.get(subjectId);
    };

    periodData.studies.forEach((row) => {
      const subjectId = resolveSubjectId(row);
      const stat = ensureSubject(subjectId);

      if (!stat) return;

      stat.studyMinutes += safeNumber(row.study_minutes);
      stat.studyCount += 1;

      if (row.lesson_id) {
        stat.studiedLessons.add(row.lesson_id);
      }

      if (row.score !== null && row.score !== undefined && row.exam_total) {
        const score = safeNumber(row.score);
        const total = safeNumber(row.exam_total);

        if (total > 0) {
          stat.scores.push(clamp((score / total) * 100));
        }
      }
    });

    periodData.focusSessions.forEach((row) => {
      const subjectId = resolveSubjectId(row);
      const stat = ensureSubject(subjectId);

      if (!stat) return;

      stat.focusSeconds += safeNumber(row.actual_seconds);
      stat.focusCount += 1;
    });

    periodData.tasks.forEach((row) => {
      const subjectId = resolveSubjectId(row);
      const stat = ensureSubject(subjectId);

      if (!stat) return;

      stat.tasksTotal += 1;

      if (row.is_completed) {
        stat.tasksCompleted += 1;
      }

      stat.plannedMinutes += safeNumber(row.duration_minutes);
    });

    periodData.lessonReviews.forEach((row) => {
      const subjectId = resolveSubjectId(row);
      const stat = ensureSubject(subjectId);

      if (!stat) return;

      stat.reviewsTotal += 1;

      if (row.status === "completed" || row.completed_at) {
        stat.reviewsCompleted += 1;
      }

      if (row.memory_score !== null && row.memory_score !== undefined) {
        stat.memoryScores.push(normalizeMemoryScore(row.memory_score));
      }
    });

    periodData.reviews.forEach((row) => {
      const subjectId = resolveSubjectId(row);
      const stat = ensureSubject(subjectId);

      if (!stat) return;

      // لو student_lesson_reviews موجودة لنفس الدرس
      // لا نضاعف عدد المراجعات.
      const hasDetailedReview = periodData.lessonReviews.some(
        (detail) => detail.lesson_id === row.lesson_id
      );

      if (!hasDetailedReview) {
        stat.reviewsTotal += 1;

        if (row.status === "completed" || row.reviewed_at) {
          stat.reviewsCompleted += 1;
        }
      }
    });

    periodData.errors.forEach((row) => {
      const subjectId = resolveSubjectId(row);
      const stat = ensureSubject(subjectId);

      if (!stat) return;

      stat.errorsTotal += 1;

      if (row.is_corrected || row.status === "corrected") {
        stat.errorsCorrected += 1;
      }
    });

    return Array.from(stats.values())
      .map((subject) => {
        const avgScore = average(subject.scores);
        const avgMemory = average(subject.memoryScores);

        const taskCompletion =
          subject.tasksTotal > 0
            ? (subject.tasksCompleted / subject.tasksTotal) * 100
            : 0;

        const reviewCompletion =
          subject.reviewsTotal > 0
            ? (subject.reviewsCompleted / subject.reviewsTotal) * 100
            : 0;

        const errorCorrection =
          subject.errorsTotal > 0
            ? (subject.errorsCorrected / subject.errorsTotal) * 100
            : 0;

        /*
          الترتيب العام للمادة:

          النتائج الدراسية       40%
          الذاكرة                20%
          المهام                 15%
          المراجعات              15%
          تصحيح الأخطاء         10%
        */

        const performance =
          avgScore * 0.4 +
          avgMemory * 0.2 +
          taskCompletion * 0.15 +
          reviewCompletion * 0.15 +
          errorCorrection * 0.1;

        return {
          ...subject,
          avgScore,
          avgMemory,
          taskCompletion,
          reviewCompletion,
          errorCorrection,
          performance: clamp(performance),
          focusHours: subject.focusSeconds / 3600,
          studyHours: subject.studyMinutes / 60,
          studiedLessonsCount: subject.studiedLessons.size,
        };
      })
      .filter(
        (subject) =>
          subject.studyCount > 0 ||
          subject.focusCount > 0 ||
          subject.tasksTotal > 0 ||
          subject.reviewsTotal > 0 ||
          subject.errorsTotal > 0
      )
      .sort((a, b) => b.performance - a.performance);
  }, [
    periodData,
    resolveSubjectId,
    subjectMap,
  ]);

  const overview = useMemo(() => {
    const studies = periodData.studies;
    const scores = [];

    studies.forEach((row) => {
      if (row.score !== null && row.score !== undefined && row.exam_total) {
        const total = safeNumber(row.exam_total);

        if (total > 0) {
          scores.push(clamp((safeNumber(row.score) / total) * 100));
        }
      }
    });

    periodData.reviews.forEach((row) => {
      if (row.score !== null && row.score !== undefined) {
        const score = safeNumber(row.score);
        scores.push(score <= 1 ? score * 100 : score);
      }
    });

    const averageScore = average(scores);

    const studyMinutes = studies.reduce(
      (sum, row) => sum + safeNumber(row.study_minutes),
      0
    );

    const focusSeconds = periodData.focusSessions.reduce(
      (sum, row) => sum + safeNumber(row.actual_seconds),
      0
    );

    const tasksTotal = periodData.tasks.length;

    const tasksCompleted = periodData.tasks.filter(
      (task) => task.is_completed
    ).length;

    const taskCompletion =
      tasksTotal > 0
        ? (tasksCompleted / tasksTotal) * 100
        : 0;

    const plannedMinutes = periodData.tasks.reduce(
      (sum, row) => sum + safeNumber(row.duration_minutes),
      0
    );

    const actualStudyMinutes =
      studyMinutes +
      focusSeconds / 60;

    const planCommitment =
      plannedMinutes > 0
        ? clamp((actualStudyMinutes / plannedMinutes) * 100)
        : taskCompletion;

    const reviewsTotal =
      periodData.lessonReviews.length ||
      periodData.reviews.length;

    const reviewsCompleted = periodData.lessonReviews.length
      ? periodData.lessonReviews.filter(
          (review) =>
            review.status === "completed" ||
            review.completed_at
        ).length
      : periodData.reviews.filter(
          (review) =>
            review.status === "completed" ||
            review.reviewed_at
        ).length;

    const errorsTotal = periodData.errors.length;

    const correctedErrors = periodData.errors.filter(
      (error) =>
        error.is_corrected ||
        error.status === "corrected"
    ).length;

    const studyDays = new Set();

    studies.forEach((row) => {
      const date = getDateFromRow(row, ["studied_at", "created_at"]);

      if (date) {
        studyDays.add(dateKey(date));
      }
    });

    periodData.focusSessions.forEach((row) => {
      const date = getDateFromRow(row, ["started_at", "created_at"]);

      if (date) {
        studyDays.add(dateKey(date));
      }
    });

    return {
      averageScore,
      studyMinutes,
      studyHours: studyMinutes / 60,
      focusSeconds,
      focusHours: focusSeconds / 3600,
      tasksTotal,
      tasksCompleted,
      taskCompletion,
      plannedMinutes,
      planCommitment,
      reviewsTotal,
      reviewsCompleted,
      reviewCompletion:
        reviewsTotal > 0
          ? (reviewsCompleted / reviewsTotal) * 100
          : 0,
      errorsTotal,
      correctedErrors,
      errorCorrection:
        errorsTotal > 0
          ? (correctedErrors / errorsTotal) * 100
          : 0,
      studyDays: studyDays.size,
      studiedLessons: new Set(
        studies
          .map((row) => row.lesson_id)
          .filter(Boolean)
      ).size,
      activeSubjects: subjectStats.length,
    };
  }, [periodData, subjectStats]);

  const trendData = useMemo(() => {
    const days = [];

    for (
      let index = 0;
      index < periodInfo.days;
      index += 1
    ) {
      const date = new Date(startDate);

      date.setDate(startDate.getDate() + index);

      if (date > endDate) continue;

      const key = dateKey(date);

      const studies = periodData.studies.filter((row) => {
        const rowDate = getDateFromRow(row, ["studied_at", "created_at"]);
        return rowDate && dateKey(rowDate) === key;
      });

      const focus = periodData.focusSessions.filter((row) => {
        const rowDate = getDateFromRow(row, ["started_at", "created_at"]);
        return rowDate && dateKey(rowDate) === key;
      });

      const tasks = periodData.tasks.filter((row) => {
        const rowDate = getDateFromRow(row, [
          "completed_at",
          "created_at",
          "plan_date",
        ]);

        return rowDate && dateKey(rowDate) === key;
      });

      const studyMinutes = studies.reduce(
        (sum, row) => sum + safeNumber(row.study_minutes),
        0
      );

      const focusMinutes = focus.reduce(
        (sum, row) => sum + safeNumber(row.actual_seconds) / 60,
        0
      );

      const completedTasks = tasks.filter(
        (task) => task.is_completed
      ).length;

      const dayLabel =
        date.getDate() +
        "/" +
        (date.getMonth() + 1);

      days.push({
        key,
        date: dayLabel,
        study: Math.round(studyMinutes),
        focus: Math.round(focusMinutes),
        tasks: completedTasks,
      });
    }

    // في السنة نعرض كل أسبوع بدل 365 نقطة
    if (period === "year") {
      const grouped = [];

      for (
        let index = 0;
        index < days.length;
        index += 7
      ) {
        const chunk = days.slice(index, index + 7);

        grouped.push({
          date: chunk[0]?.date || "",
          study: chunk.reduce(
            (sum, item) => sum + item.study,
            0
          ),
          focus: chunk.reduce(
            (sum, item) => sum + item.focus,
            0
          ),
          tasks: chunk.reduce(
            (sum, item) => sum + item.tasks,
            0
          ),
        });
      }

      return grouped;
    }

    return days;
  }, [
    periodData,
    periodInfo.days,
    startDate,
    endDate,
    period,
  ]);

  const taskDistribution = useMemo(() => {
    const completed = periodData.tasks.filter(
      (task) => task.is_completed
    ).length;

    const pending =
      periodData.tasks.length -
      completed;

    return [
      {
        name: "مكتملة",
        value: completed,
      },
      {
        name: "غير مكتملة",
        value: pending,
      },
    ].filter((item) => item.value > 0);
  }, [periodData.tasks]);

  const activityDistribution = useMemo(() => {
    const study = overview.studyMinutes;
    const focus = overview.focusSeconds / 60;

    const tasks = periodData.tasks.reduce(
      (sum, task) =>
        sum +
        safeNumber(task.duration_minutes),
      0
    );

    return [
      {
        name: "المذاكرة",
        value: Math.round(study),
      },
      {
        name: "جلسات التركيز",
        value: Math.round(focus),
      },
      {
        name: "المهام",
        value: Math.round(tasks),
      },
    ].filter((item) => item.value > 0);
  }, [overview, periodData.tasks]);

  const bestStudyTimes = useMemo(() => {
    const buckets = [
      {
        label: "الصباح",
        from: 5,
        to: 12,
        minutes: 0,
      },
      {
        label: "الظهر",
        from: 12,
        to: 17,
        minutes: 0,
      },
      {
        label: "المساء",
        from: 17,
        to: 22,
        minutes: 0,
      },
      {
        label: "الليل",
        from: 22,
        to: 5,
        minutes: 0,
      },
    ];

    periodData.focusSessions.forEach((session) => {
      const date = getDateFromRow(session, [
        "started_at",
        "created_at",
      ]);

      if (!date) return;

      const hour = date.getHours();

      let bucket;

      if (hour >= 5 && hour < 12) {
        bucket = buckets[0];
      } else if (hour >= 12 && hour < 17) {
        bucket = buckets[1];
      } else if (hour >= 17 && hour < 22) {
        bucket = buckets[2];
      } else {
        bucket = buckets[3];
      }

      bucket.minutes += safeNumber(session.actual_seconds) / 60;
    });

    periodData.studies.forEach((study) => {
      const date = getDateFromRow(study, [
        "studied_at",
        "created_at",
      ]);

      if (!date) return;

      const hour = date.getHours();

      let bucket;

      if (hour >= 5 && hour < 12) {
        bucket = buckets[0];
      } else if (hour >= 12 && hour < 17) {
        bucket = buckets[1];
      } else if (hour >= 17 && hour < 22) {
        bucket = buckets[2];
      } else {
        bucket = buckets[3];
      }

      bucket.minutes += safeNumber(study.study_minutes);
    });

    return buckets
      .map((bucket) => ({
        ...bucket,
        minutes: Math.round(bucket.minutes),
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [periodData]);

  const weeklyFocus = useMemo(() => {
    const result = [
      {
        name: "السبت",
        value: 0,
      },
      {
        name: "الأحد",
        value: 0,
      },
      {
        name: "الإثنين",
        value: 0,
      },
      {
        name: "الثلاثاء",
        value: 0,
      },
      {
        name: "الأربعاء",
        value: 0,
      },
      {
        name: "الخميس",
        value: 0,
      },
      {
        name: "الجمعة",
        value: 0,
      },
    ];

    const sessions = periodData.focusSessions;

    sessions.forEach((session) => {
      const date = getDateFromRow(session, [
        "started_at",
        "created_at",
      ]);

      if (!date) return;

      // JS: الأحد = 0
      const day = date.getDay();
      const saturdayIndex = day === 6 ? 0 : day + 1;

      result[saturdayIndex].value +=
        safeNumber(session.actual_seconds) / 3600;
    });

    return result.map((item) => ({
      ...item,
      value: Number(item.value.toFixed(1)),
    }));
  }, [periodData.focusSessions]);

  const radarData = useMemo(() => {
    return subjectStats
      .slice(0, 8)
      .map((subject) => ({
        subject:
          subject.name.length > 14
            ? `${subject.name.slice(0, 14)}…`
            : subject.name,
        performance: Number(subject.performance.toFixed(1)),
        score: Number(subject.avgScore.toFixed(1)),
        tasks: Number(subject.taskCompletion.toFixed(1)),
        reviews: Number(subject.reviewCompletion.toFixed(1)),
      }));
  }, [subjectStats]);

  const strongestSubject = subjectStats[0] || null;

  const weakestSubject = subjectStats.length
    ? subjectStats[subjectStats.length - 1]
    : null;

  const smartInsights = useMemo(() => {
    const insights = [];

    if (overview.averageScore >= 85) {
      insights.push({
        type: "success",
        icon: <FiAward />,
        title: "مستواك الدراسي ممتاز",
        text: `متوسط نتائجك ${Math.round(
          overview.averageScore
        )}% خلال ${periodInfo.label}. حافظ على نفس المستوى.`,
      });
    } else if (overview.averageScore >= 70) {
      insights.push({
        type: "info",
        icon: <FiTrendingUp />,
        title: "أداؤك الدراسي جيد",
        text: `متوسط نتائجك ${Math.round(
          overview.averageScore
        )}%. مع مراجعة الأخطاء ستقدر ترفع النتيجة أكثر.`,
      });
    } else if (overview.averageScore > 0) {
      insights.push({
        type: "warning",
        icon: <FiTrendingDown />,
        title: "نتائجك تحتاج تحسين",
        text: `متوسط نتائجك ${Math.round(
          overview.averageScore
        )}%. ركز على المواد الأضعف وراجع أخطاءك باستمرار.`,
      });
    }

    if (overview.taskCompletion >= 80) {
      insights.push({
        type: "success",
        icon: <FiCheckCircle />,
        title: "التزامك بالمهام قوي",
        text: `أنجزت ${Math.round(
          overview.taskCompletion
        )}% من مهام الفترة.`,
      });
    } else if (overview.tasksTotal > 0) {
      insights.push({
        type: "warning",
        icon: <FiTarget />,
        title: "ارفع معدل إنجاز المهام",
        text: `أنجزت ${Math.round(
          overview.taskCompletion
        )}% فقط من المهام. حاول تقسيم المهام الكبيرة إلى خطوات أصغر.`,
      });
    }

    if (overview.focusHours >= 10) {
      insights.push({
        type: "success",
        icon: <FiZap />,
        title: "جلسات التركيز ممتازة",
        text: `حققت ${formatHours(
          overview.focusHours
        )} من التركيز خلال الفترة.`,
      });
    }

    if (
      overview.errorsTotal > 0 &&
      overview.errorCorrection < 50
    ) {
      insights.push({
        type: "warning",
        icon: <FiAlertCircle />,
        title: "لديك أخطاء تحتاج مراجعة",
        text: `لديك ${overview.errorsTotal} خطأ، وتم تصحيح ${overview.correctedErrors} فقط. خصص وقتًا ثابتًا لمراجعتها.`,
      });
    }

    if (strongestSubject) {
      insights.push({
        type: "info",
        icon: <FiBookOpen />,
        title: "أقوى مادة لديك",
        text: `${strongestSubject.name} تتصدر ترتيب المواد بنسبة ${Math.round(
          strongestSubject.performance
        )}%.`,
      });
    }

    if (
      weakestSubject &&
      subjectStats.length > 1
    ) {
      insights.push({
        type: "danger",
        icon: <FiActivity />,
        title: "مادة تحتاج اهتمامًا أكبر",
        text: `${weakestSubject.name} هي الأقل حاليًا بنسبة ${Math.round(
          weakestSubject.performance
        )}%.`,
      });
    }

    return insights.slice(0, 6);
  }, [
    overview,
    strongestSubject,
    weakestSubject,
    subjectStats.length,
    periodInfo.label,
  ]);

  const exportReport = useCallback(() => {
    const rows = [
      [
        "المادة",
        "التقييم العام",
        "متوسط الدرجات",
        "ساعات المذاكرة",
        "ساعات التركيز",
        "إنجاز المهام",
        "إنجاز المراجعات",
        "تصحيح الأخطاء",
      ],
      ...subjectStats.map((subject) => [
        subject.name,
        Math.round(subject.performance),
        Math.round(subject.avgScore),
        subject.studyHours.toFixed(1),
        subject.focusHours.toFixed(1),
        Math.round(subject.taskCompletion),
        Math.round(subject.reviewCompletion),
        Math.round(subject.errorCorrection),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) =>
            `"${String(cell).replaceAll(
              '"',
              '""'
            )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `study-report-${period}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }, [subjectStats, period]);

  if (loading) {
    return (
      <div className={`reports-page ${darkMode ? "dark-mode" : ""}`}>
        <Header />

        <main className="reports-container">
          <div className="reports-loading">
            <div className="reports-spinner" />

            <h3>جاري تجهيز تقريرك...</h3>

            <p>
              بنجمع بيانات المذاكرة
              والتركيز والمهام والمراجعات.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`reports-page ${darkMode ? "dark-mode" : ""}`}>
        <Header />

        <main className="reports-container">
          <div className="reports-error">
            <FiAlertCircle />

            <h2>تعذر تحميل التقرير</h2>

            <p>{error}</p>

            <button
              className="reports-primary-btn"
              onClick={() => loadReports()}
            >
              <FiRefreshCw />
              إعادة المحاولة
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`reports-page ${darkMode ? "dark-mode" : ""}`}>
      <Header />

      <main className="reports-container">
        {/* Period */}
        <section className="reports-toolbar">
          <div className="period-title">
            <FiCalendar />

            <div>
              <strong>الفترة الزمنية</strong>

              <span>
                اعرض تقدمك حسب الفترة التي تريدها
              </span>
            </div>
          </div>

          <div className="period-switcher">
            {Object.entries(PERIODS).map(([key, item]) => (
              <button
                key={key}
                className={period === key ? "active" : ""}
                onClick={() => setPeriod(key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* KPIs */}
        <section className="reports-kpis">
          <div className="report-kpi-card">
            <div className="kpi-icon purple">
              <FiAward />
            </div>

            <div>
              <span>متوسط النتائج</span>

              <strong>
                {overview.averageScore
                  ? `${Math.round(overview.averageScore)}%`
                  : "—"}
              </strong>

              <small>من نتائج الاختبارات</small>
            </div>
          </div>

          <div className="report-kpi-card">
            <div className="kpi-icon cyan">
              <FiClock />
            </div>

            <div>
              <span>وقت المذاكرة</span>

              <strong>{formatHours(overview.studyHours)}</strong>

              <small>{overview.studyDays} أيام مذاكرة</small>
            </div>
          </div>

          <div className="report-kpi-card">
            <div className="kpi-icon green">
              <FiZap />
            </div>

            <div>
              <span>التركيز</span>

              <strong>{formatHours(overview.focusHours)}</strong>

              <small>{periodData.focusSessions.length} جلسة</small>
            </div>
          </div>

          <div className="report-kpi-card">
            <div className="kpi-icon orange">
              <FiCheckCircle />
            </div>

            <div>
              <span>إنجاز المهام</span>

              <strong>
                {Math.round(overview.taskCompletion)}%
              </strong>

              <small>
                {overview.tasksCompleted} من {overview.tasksTotal}
              </small>
            </div>
          </div>

          <div className="report-kpi-card">
            <div className="kpi-icon blue">
              <FiBookOpen />
            </div>

            <div>
              <span>الدروس المدروسة</span>

              <strong>{overview.studiedLessons}</strong>

              <small>درس مختلف</small>
            </div>
          </div>

          <div className="report-kpi-card">
            <div className="kpi-icon red">
              <FiAlertCircle />
            </div>

            <div>
              <span>تصحيح الأخطاء</span>

              <strong>
                {Math.round(overview.errorCorrection)}%
              </strong>

              <small>
                {overview.correctedErrors} من {overview.errorsTotal}
              </small>
            </div>
          </div>
        </section>

        {/* Main Trend */}
        <section className="report-card report-large-card">
          <div className="report-card-header">
            <div>
              <h2>نشاطك الدراسي</h2>

              <p>
                مقارنة وقت المذاكرة والتركيز وإنجاز المهام
              </p>
            </div>
          </div>

          <div className="chart-container">
            {trendData.length ? (
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={trendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    opacity={0.3}
                  />

                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                  />

                  <YAxis
                    tick={{ fontSize: 11 }}
                  />

                  <Tooltip content={<AppTooltip />} />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="study"
                    name="المذاكرة بالدقائق"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="focus"
                    name="التركيز بالدقائق"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="tasks"
                    name="المهام المكتملة"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                لا توجد بيانات خلال هذه الفترة
              </div>
            )}
          </div>
        </section>

        {/* Second row */}
        <section className="reports-grid two-columns">
          <div className="report-card">
            <div className="report-card-header">
              <div>
                <h2>أداء المواد</h2>

                <p>مقارنة شاملة بين المواد</p>
              </div>
            </div>

            <div className="chart-container">
              {radarData.length ? (
                <ResponsiveContainer width="100%" height={330}>
                  <RadarChart data={radarData}>
                    <PolarGrid />

                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 10 }}
                    />

                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 9 }}
                    />

                    <Radar
                      name="الأداء"
                      dataKey="performance"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.3}
                    />

                    <Tooltip content={<AppTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  لا توجد بيانات مواد كافية
                </div>
              )}
            </div>
          </div>

          <div className="report-card">
            <div className="report-card-header">
              <div>
                <h2>حالة المهام</h2>

                <p>
                  نسبة المهام المكتملة وغير المكتملة
                </p>
              </div>
            </div>

            <div className="chart-container pie-chart">
              {taskDistribution.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={taskDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={4}
                    >
                      {taskDistribution.map((_, index) => (
                        <Cell
                          key={index}
                          fill={index === 0 ? "#10b981" : "#ef4444"}
                        />
                      ))}
                    </Pie>

                    <Tooltip content={<AppTooltip />} />

                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  لا توجد مهام خلال الفترة
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Subject Ranking */}
        <section className="report-card subject-ranking-card">
          <div className="report-card-header">
            <div>
              <h2>ترتيب المواد</h2>

              <p>
                ترتيب كل المواد التي لديك نشاط فعلي فيها خلال الفترة
              </p>
            </div>

            <span className="subjects-count">
              {subjectStats.length} مادة
            </span>
          </div>

          {subjectStats.length ? (
            <div className="subject-ranking-list">
              {subjectStats.map((subject, index) => (
                <div
                  className="subject-ranking-row"
                  key={subject.id}
                >
                  <div className="subject-rank">
                    {index < 3 ? (
                      <span
                        className={`rank-medal rank-${index + 1}`}
                      >
                        {index + 1}
                      </span>
                    ) : (
                      <span className="rank-number">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  <div className="subject-main-info">
                    <div className="subject-title-row">
                      <div>
                        <strong>{subject.name}</strong>

                        {subject.subtitle && (
                          <small>
                            {subject.subtitle}
                          </small>
                        )}
                      </div>

                      <span
                        className={`performance-badge ${getScoreClass(
                          subject.performance
                        )}`}
                      >
                        {getPerformanceLabel(
                          subject.performance
                        )}
                      </span>
                    </div>

                    <div className="subject-progress">
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${clamp(subject.performance)}%`,
                            background: getSubjectColor(index),
                          }}
                        />
                      </div>

                      <strong>
                        {Math.round(subject.performance)}%
                      </strong>
                    </div>

                    <div className="subject-mini-stats">
                      <span>
                        <FiClock />
                        {formatHours(subject.studyHours)}
                      </span>

                      <span>
                        <FiZap />
                        {formatHours(subject.focusHours)}
                      </span>

                      <span>
                        <FiBookOpen />
                        {subject.studiedLessonsCount} درس
                      </span>

                      <span>
                        <FiCheckCircle />
                        {Math.round(subject.taskCompletion)}% مهام
                      </span>

                      <span>
                        <FiActivity />
                        {Math.round(subject.avgScore)}% درجات
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-content">
              <FiBookOpen />

              <h3>لا توجد مواد بها نشاط</h3>

              <p>
                ابدأ مذاكرة أو سجل جلسة تركيز حتى يظهر ترتيب المواد.
              </p>
            </div>
          )}
        </section>

        {/* Stats grid */}
        <section className="reports-grid three-columns">
          <div className="report-card compact-chart-card">
            <div className="report-card-header">
              <div>
                <h2>أفضل أوقات المذاكرة</h2>

                <p>بناءً على نشاطك الفعلي</p>
              </div>
            </div>

            <div className="time-ranking">
              {bestStudyTimes.map((time, index) => (
                <div
                  className="time-row"
                  key={time.label}
                >
                  <div className="time-name">
                    <span>{index + 1}</span>

                    <strong>{time.label}</strong>
                  </div>

                  <div className="time-value">
                    {formatMinutes(time.minutes)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="report-card compact-chart-card">
            <div className="report-card-header">
              <div>
                <h2>التركيز خلال الأسبوع</h2>

                <p>توزيع ساعات التركيز</p>
              </div>
            </div>

            <div className="chart-container small">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyFocus}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    opacity={0.3}
                  />

                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                  />

                  <YAxis
                    tick={{ fontSize: 9 }}
                  />

                  <Tooltip content={<AppTooltip />} />

                  <Bar
                    dataKey="value"
                    name="ساعات التركيز"
                    fill="#06b6d4"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="report-card compact-chart-card">
            <div className="report-card-header">
              <div>
                <h2>توزيع النشاط</h2>

                <p>أين يذهب وقتك؟</p>
              </div>
            </div>

            <div className="chart-container small">
              {activityDistribution.length ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={activityDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={85}
                    >
                      {activityDistribution.map((_, index) => (
                        <Cell
                          key={index}
                          fill={getSubjectColor(index)}
                        />
                      ))}
                    </Pie>

                    <Tooltip content={<AppTooltip />} />

                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  لا توجد بيانات نشاط
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Performance summary */}
        <section className="reports-grid two-columns">
          <div className="report-card">
            <div className="report-card-header">
              <div>
                <h2>مؤشرات المراجعة</h2>

                <p>
                  مدى التزامك بالمراجعة وتصحيح الأخطاء
                </p>
              </div>
            </div>

            <div className="metric-list">
              <div className="metric-row">
                <div>
                  <span>إجمالي المراجعات</span>

                  <strong>
                    {overview.reviewsTotal}
                  </strong>
                </div>

                <div className="metric-bar">
                  <span
                    style={{
                      width: `${clamp(
                        overview.reviewCompletion
                      )}%`,
                    }}
                  />
                </div>

                <b>
                  {Math.round(
                    overview.reviewCompletion
                  )}
                  %
                </b>
              </div>

              <div className="metric-row">
                <div>
                  <span>تصحيح الأخطاء</span>

                  <strong>
                    {overview.errorsTotal}
                  </strong>
                </div>

                <div className="metric-bar red">
                  <span
                    style={{
                      width: `${clamp(
                        overview.errorCorrection
                      )}%`,
                    }}
                  />
                </div>

                <b>
                  {Math.round(
                    overview.errorCorrection
                  )}
                  %
                </b>
              </div>

              <div className="metric-row">
                <div>
                  <span>الالتزام بالمهام</span>

                  <strong>
                    {overview.tasksTotal}
                  </strong>
                </div>

                <div className="metric-bar green">
                  <span
                    style={{
                      width: `${clamp(
                        overview.taskCompletion
                      )}%`,
                    }}
                  />
                </div>

                <b>
                  {Math.round(
                    overview.taskCompletion
                  )}
                  %
                </b>
              </div>

              <div className="metric-row">
                <div>
                  <span>الالتزام بالخطة</span>

                  <strong>
                    {Math.round(
                      overview.planCommitment
                    )}
                    %
                  </strong>
                </div>

                <div className="metric-bar orange">
                  <span
                    style={{
                      width: `${clamp(
                        overview.planCommitment
                      )}%`,
                    }}
                  />
                </div>

                <b>
                  {Math.round(
                    overview.planCommitment
                  )}
                  %
                </b>
              </div>
            </div>
          </div>

          <div className="report-card">
            <div className="report-card-header">
              <div>
                <h2>أقوى وأضعف المواد</h2>

                <p>بناءً على الأداء العام</p>
              </div>
            </div>

            <div className="strength-cards">
              {strongestSubject && (
                <div className="strength-card strongest">
                  <div className="strength-icon">
                    <FiTrendingUp />
                  </div>

                  <div>
                    <span>أقوى مادة</span>

                    <strong>
                      {strongestSubject.name}
                    </strong>

                    <small>
                      أداء{" "}
                      {Math.round(
                        strongestSubject.performance
                      )}
                      %
                    </small>
                  </div>
                </div>
              )}

              {weakestSubject && (
                <div className="strength-card weakest">
                  <div className="strength-icon">
                    <FiTrendingDown />
                  </div>

                  <div>
                    <span>تحتاج تحسين</span>

                    <strong>
                      {weakestSubject.name}
                    </strong>

                    <small>
                      أداء{" "}
                      {Math.round(
                        weakestSubject.performance
                      )}
                      %
                    </small>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Smart analysis */}
        <section className="report-card smart-analysis">
          <div className="report-card-header">
            <div>
              <span className="analysis-label">
                <FiZap />
                تحليل ذكي
              </span>

              <h2>ماذا تقول بياناتك؟</h2>

              <p>
                ملاحظات مبنية على نشاطك الحقيقي في الفترة المحددة.
              </p>
            </div>
          </div>

          {smartInsights.length ? (
            <div className="insights-grid">
              {smartInsights.map((insight, index) => (
                <div
                  className={`insight-card ${insight.type}`}
                  key={index}
                >
                  <div className="insight-icon">
                    {insight.icon}
                  </div>

                  <div>
                    <strong>
                      {insight.title}
                    </strong>

                    <p>{insight.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-content">
              <FiActivity />

              <h3>نحتاج بيانات أكثر</h3>

              <p>
                استخدم Study Journey لفترة أطول حتى نقدر نحلل نمط مذاكرتك.
              </p>
            </div>
          )}
        </section>

        {/* Recommendation */}
        <section className="reports-cta">
          <div className="cta-icon">
            <FiTarget />
          </div>

          <div>
            <h2>جاهز تحسن نتيجتك؟</h2>

            <p>
              استخدم بيانات التقرير لتحدد المواد التي تحتاج وقتًا أكبر وضع خطة مذاكرة مناسبة.
            </p>
          </div>

          <button onClick={() => navigate("/Plan")}>
            افتح الخطة الدراسية
            <FiTrendingUp />
          </button>
        </section>

        <footer className="reports-footer">
          آخر تحديث من قاعدة البيانات:
          <strong>
            {new Date().toLocaleString("ar-EG")}
          </strong>
        </footer>
      </main>
    </div>
  );
}