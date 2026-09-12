import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaFilter,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaBookOpen,
  FaChartLine,
  FaBolt,
  FaAtom,
  FaFlask,
  FaCalculator,
  FaBook,
  FaLightbulb,
  FaBrain,
  FaMap,
  FaClipboardList,
  FaCheck,
  FaLock,
  FaArrowLeft,
  FaCalendarAlt,
  FaClock,
  FaTrophy,
} from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import Header from "../../components/Header/Header";
import { supabase } from "../../utils/supabaseClient";
import "./Review.css";

const Review = () => {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  // =========================================================
  // STATE
  // =========================================================
  const [selectedFilter, setSelectedFilter] = useState("الكل");
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [subjectMemory, setSubjectMemory] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // =========================================================
  // DATE HELPERS
  // =========================================================
  const getTodayDate = useCallback(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const normalizeDate = useCallback((value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }, []);
  const getDateKey = useCallback((value) => {
    const date = normalizeDate(value);
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [normalizeDate]);
  const formatArabicDate = useCallback((value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(date);
  }, []);
  const formatArabicTime = useCallback((value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit", hour12: true }).format(date).replace("AM", "ص").replace("PM", "م");
  }, []);
  // =========================================================
  // REVIEW STATUS
  // =========================================================
  const getReviewStatus = useCallback((review) => {
    if (!review) {
      return "upcoming";
    }
    if (review.completed_at) {
      return "completed";
    }
    if (review.status === "completed") {
      return "completed";
    }
    const scheduled = normalizeDate(review.scheduled_at);
    const today = getTodayDate();
    if (!scheduled) {
      return "upcoming";
    }
    if (scheduled.getTime() === today.getTime()) {
      return "today";
    }
    if (scheduled < today) {
      return "late";
    }
    return "upcoming";
  }, [getTodayDate, normalizeDate]);
  // =========================================================
  // RELATIVE DATE
  // =========================================================
  const getRelativeDate = useCallback((review) => {
    const status = getReviewStatus(review);
    if (status === "today") {
      return "اليوم";
    }
    if (status === "late") {
      const scheduled = normalizeDate(review?.scheduled_at);
      const today = getTodayDate();
      if (!scheduled) {
        return "متأخرة";
      }
      const diffDays = Math.floor((today.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        return "متأخرة";
      }
      if (diffDays === 1) {
        return "متأخرة يوم";
      }
      return `متأخرة ${diffDays} أيام`;
    }
    if (status === "completed") {
      return "تمت المراجعة";
    }
    const scheduled = normalizeDate(review?.scheduled_at);
    const today = getTodayDate();
    if (!scheduled) {
      return formatArabicDate(review?.scheduled_at);
    }
    const diffDays = Math.round((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      return "غدًا";
    }
    if (diffDays > 1) {
      return `بعد ${diffDays} أيام`;
    }
    return formatArabicDate(review?.scheduled_at);
  }, [formatArabicDate, getReviewStatus, getTodayDate, normalizeDate]);
  // =========================================================
  // SUBJECT ICON
  // =========================================================
  const getSubjectIcon = useCallback((subjectName) => {
    const name = String(subjectName || "").trim();
    if (name.includes("فيزياء")) {
      return <FaAtom />;
    }
    if (name.includes("كيمياء")) {
      return <FaFlask />;
    }
    if (name.includes("رياض")) {
      return <FaCalculator />;
    }
    if (name.includes("أحياء") || name.includes("احياء")) {
      return <FaBrain />;
    }
    if (name.includes("عربي") || name.includes("العربي")) {
      return <FaBook />;
    }
    return <FaBookOpen />;
  }, []);
  const getSubjectIconType = useCallback((subjectName) => {
    const name = String(subjectName || "").trim();
    if (name.includes("فيزياء")) {
      return "physics";
    }
    if (name.includes("كيمياء")) {
      return "chemistry";
    }
    if (name.includes("رياض")) {
      return "math";
    }
    if (name.includes("أحياء") || name.includes("احياء")) {
      return "biology";
    }
    if (name.includes("عربي") || name.includes("العربي")) {
      return "arabic";
    }
    return "default";
  }, []);
  // =========================================================
  // REVIEW ACTION
  // =========================================================
  const getReviewAction = useCallback((review) => {
    const status = getReviewStatus(review);
    if (status === "late") {
      return "مراجعة الآن";
    }
    if (status === "today") {
      return "ابدأ المراجعة";
    }
    return "ابدأ المراجعة";
  }, [getReviewStatus]);
  // =========================================================
  // FETCH REVIEWS
  //
  // نعتمد مباشرة على:
  // student_lesson_reviews
  // subject_lessons
  // subject_units
  // subjects
  // student_lesson_study
  // =========================================================
  const fetchReviewData = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      // =====================================================
      // USER
      // =====================================================
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw userError;
      }
      if (!user) {
        throw new Error("يجب تسجيل الدخول أولًا.");
      }
      // =====================================================
      // تحديث حالات المراجعات المتأخرة
      // =====================================================
      try {
        const { error: lateError } = await supabase.rpc("update_late_lesson_reviews");
        if (lateError) {
          console.warn("update_late_lesson_reviews:", lateError.message);
        }
      } catch (rpcError) {
        console.warn("Late reviews RPC error:", rpcError);
      }
      // =====================================================
      // STUDY RECORDS
      //
      // أول حاجة نجيب الدروس اللي الطالب ذاكرها فعلًا.
      //
      // student_lesson_study هو المصدر الأساسي هنا.
      //
      // أي درس مش موجود هنا مش هيظهر في صفحة Review.
      // =====================================================
      const { data: studyData, error: studyError } = await supabase.from("student_lesson_study").select(`
            id,
            user_id,
            subject_id,
            unit_id,
            lesson_id,
            studied_at,
            study_minutes,
            score,
            exam_total,
            notes,
            created_at
          `).eq("user_id", user.id).order("created_at", { ascending: false });
      if (studyError) {
        throw studyError;
      }
      const studyRecords = studyData || [];
      // =====================================================
      // LESSON IDS
      //
      // الدروس التي تمت مذاكرتها فعلًا فقط.
      // =====================================================
      const studiedLessonIds = [...new Set(studyRecords.map((study) => study.lesson_id).filter(Boolean))];
      // =====================================================
      // آخر دراسة لكل درس
      //
      // لأن البيانات مرتبة created_at DESC
      // أول record لكل lesson هو أحدث دراسة.
      // =====================================================
      const studyMap = new Map();
      for (const study of studyRecords) {
        if (!study.lesson_id) {
          continue;
        }
        if (!studyMap.has(study.lesson_id)) {
          studyMap.set(study.lesson_id, study);
        }
      }
      // =====================================================
      // REVIEWS
      //
      // هنا أهم تعديل:
      //
      // لا نجيب Reviews لكل الدروس.
      //
      // نجيب Reviews فقط للدروس الموجودة
      // في student_lesson_study.
      // =====================================================
      let rawReviews = [];
      if (studiedLessonIds.length > 0) {
        const { data: reviewsData, error: reviewsError } = await supabase.from("student_lesson_reviews").select(`
              id,
              user_id,
              lesson_id,
              study_id,
              review_number,
              scheduled_at,
              completed_at,
              status,
              memory_score,
              difficulty,
              notes,
              created_at,
              updated_at
            `).eq("user_id", user.id).in("lesson_id", studiedLessonIds).order("scheduled_at", { ascending: true });
        if (reviewsError) {
          throw reviewsError;
        }
        rawReviews = reviewsData || [];
      }
      // =====================================================
      // LESSON IDS
      //
      // Reviews الموجودة فعلًا للدروس التي تمت مذاكرتها.
      // =====================================================
      const lessonIds = [...new Set(rawReviews.map((review) => review.lesson_id).filter(Boolean))];
      // =====================================================
      // LESSONS + UNITS + SUBJECTS
      // =====================================================
      let lessonsMap = new Map();
      if (lessonIds.length > 0) {
        // ===================================================
        // LESSONS
        // ===================================================
        const { data: lessonsData, error: lessonsError } = await supabase.from("subject_lessons").select(`
              id,
              unit_id,
              lesson_number,
              title,
              is_active
            `).in("id", lessonIds);
        if (lessonsError) {
          console.warn("subject_lessons:", lessonsError.message);
        }
        const lessons = lessonsData || [];
        // ===================================================
        // UNIT IDS
        // ===================================================
        const unitIds = [...new Set(lessons.map((lesson) => lesson.unit_id).filter(Boolean))];
        // ===================================================
        // UNITS
        // ===================================================
        let unitsMap = new Map();
        if (unitIds.length > 0) {
          const { data: unitsData, error: unitsError } = await supabase.from("subject_units").select(`
                id,
                subject_id,
                unit_number,
                title,
                is_active
              `).in("id", unitIds);
          if (unitsError) {
            console.warn("subject_units:", unitsError.message);
          }
          const units = unitsData || [];
          unitsMap = new Map(units.map((unit) => [unit.id, unit]));
          // =================================================
          // SUBJECT IDS
          // =================================================
          const subjectIds = [...new Set(units.map((unit) => unit.subject_id).filter(Boolean))];
          // =================================================
          // SUBJECTS
          // =================================================
          let subjectsMap = new Map();
          if (subjectIds.length > 0) {
            const { data: subjectsData, error: subjectsError } = await supabase.from("subjects").select(`
                  id,
                  name,
                  subtitle,
                  type,
                  icon,
                  icon_class,
                  slug,
                  is_active
                `).in("id", subjectIds);
            if (subjectsError) {
              console.warn("subjects:", subjectsError.message);
            }
            subjectsMap = new Map((subjectsData || []).map((subject) => [subject.id, subject]));
          }
          // =================================================
          // BUILD LESSON MAP
          // =================================================
          lessonsMap = new Map(lessons.map((lesson) => {
            const unit = unitsMap.get(lesson.unit_id);
            const subject = unit ? subjectsMap.get(unit.subject_id) : null;
            return [lesson.id, { ...lesson, unit, subject }];
          }));
        }
      }
      // =====================================================
      // MERGE REVIEWS + STUDY + LESSON + UNIT + SUBJECT
      // =====================================================
      const mergedReviews = rawReviews.map((review) => {
        const lessonInfo = lessonsMap.get(review.lesson_id);
        const unit = lessonInfo?.unit;
        const subject = lessonInfo?.subject;
        // أحدث دراسة للدرس
        const latestStudy = studyMap.get(review.lesson_id);
        return {
          ...review,
          // =========================================
          // LESSON
          // =========================================
          lesson_number: lessonInfo?.lesson_number ?? null,
          lesson_title: lessonInfo?.title || null,
          // =========================================
          // UNIT
          // =========================================
          unit_id: unit?.id || latestStudy?.unit_id || null,
          unit_number: unit?.unit_number ?? null,
          unit_title: unit?.title || null,
          // =========================================
          // SUBJECT
          // =========================================
          subject_id: subject?.id || latestStudy?.subject_id || null,
          subject_name: subject?.name || null,
          subject_subtitle: subject?.subtitle || null,
          subject_type: subject?.type || null,
          subject_icon: subject?.icon || null,
          // =========================================
          // LATEST STUDY
          // =========================================
          latest_study_id: latestStudy?.id || review.study_id || null,
          last_studied_at: latestStudy?.studied_at || null,
          last_score: latestStudy?.score ?? null,
          exam_total: latestStudy?.exam_total ?? null,
          last_study_minutes: latestStudy?.study_minutes ?? null,
          last_study_notes: latestStudy?.notes || null,
        };
      })
      // =================================================
      // تأكيد نهائي:
      //
      // لا يظهر Review إلا لو الدرس موجود فعلًا
      // في student_lesson_study.
      // =================================================
      .filter((review) => review.lesson_id && studyMap.has(review.lesson_id));
      // =====================================================
      // STATISTICS VIEW
      // =====================================================
      let statsData = null;
      try {
        const { data, error: statsError } = await supabase.from("student_review_statistics").select("*").maybeSingle();
        if (statsError) {
          console.warn("student_review_statistics:", statsError.message);
        } else {
          statsData = data;
        }
      } catch (statsException) {
        console.warn("Statistics exception:", statsException);
      }
      // =====================================================
      // SUBJECT MEMORY
      // =====================================================
      let memoryData = [];
      try {
        const { data, error: memoryError } = await supabase.from("student_subject_memory").select("*").order("average_memory_score", { ascending: false, nullsFirst: false });
        if (memoryError) {
          console.warn("student_subject_memory:", memoryError.message);
        } else {
          memoryData = data || [];
        }
      } catch (memoryException) {
        console.warn("Memory exception:", memoryException);
      }
      // =====================================================
      // ACHIEVEMENTS
      // =====================================================
      let mergedAchievements = [];
      try {
        // ================================================
        // USER ACHIEVEMENTS
        // ================================================
        const { data: achievementsData, error: achievementsError } = await supabase.from("user_achievements").select(`
              achievement_id,
              points_earned,
              achieved_at
            `).eq("user_id", user.id).order("achieved_at", { ascending: false });
        if (achievementsError) {
          console.warn("user_achievements:", achievementsError.message);
        }
        // ================================================
        // ACHIEVEMENT DEFINITIONS
        // ================================================
        const { data: definitionsData, error: definitionsError } = await supabase.from("achievement_definitions").select(`
              id,
              title,
              description,
              icon,
              icon_type,
              is_badge,
              is_active
            `).eq("is_active", true);
        if (definitionsError) {
          console.warn("achievement_definitions:", definitionsError.message);
        }
        // ================================================
        // DEFINITIONS MAP
        // ================================================
        const definitionsMap = new Map((definitionsData || []).map((item) => [item.id, item]));
        // ================================================
        // MERGE
        // ================================================
        mergedAchievements = (achievementsData || []).map((item) => ({
          ...item,
          ...(definitionsMap.get(item.achievement_id) || {}),
        })).filter((item) => item.title);
      } catch (achievementException) {
        console.warn("Achievements exception:", achievementException);
      }
      // =====================================================
      // SET STATE
      // =====================================================
      setReviews(mergedReviews);
      setReviewStats(statsData);
      setSubjectMemory(memoryData);
      setAchievements(mergedAchievements);
    } catch (err) {
      console.error("Review fetch error:", err);
      setError(err?.message || "حدث خطأ أثناء تحميل بيانات المراجعة.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  // =========================================================
  // INITIAL FETCH
  // =========================================================
  useEffect(() => {
    fetchReviewData();
  }, [fetchReviewData]);
  // =========================================================
  // NORMALIZED REVIEWS
  // =========================================================
  const normalizedReviews = useMemo(() => {
    return reviews.map((review) => {
      const status = getReviewStatus(review);
      return {
        ...review,
        calculatedStatus: status,
        title: review.lesson_title || `الدرس ${review.lesson_number || ""}`,
        subject: review.subject_name || "مادة غير محددة",
        chapter: review.unit_title || `الوحدة ${review.unit_number || ""}`,
        icon: getSubjectIcon(review.subject_name),
        iconType: getSubjectIconType(review.subject_name),
        date: getRelativeDate(review),
        time: formatArabicTime(review.scheduled_at),
        action: getReviewAction(review),
      };
    });
  }, [reviews, getReviewAction, getRelativeDate, getReviewStatus, getSubjectIcon, getSubjectIconType, formatArabicTime]);
  // =========================================================
  // REMOVE DUPLICATE PENDING REVIEWS
  //
  // لو الدرس عنده أكثر من مراجعة مستحقة:
  // نعرض أقدم مراجعة فقط.
  // =========================================================
  const uniqueDueReviews = useMemo(() => {
    const due = normalizedReviews.filter((review) => review.calculatedStatus === "today" || review.calculatedStatus === "late");
    const lessonMap = new Map();
    for (const review of due) {
      const lessonKey = review.lesson_id || review.id;
      const existing = lessonMap.get(lessonKey);
      if (!existing) {
        lessonMap.set(lessonKey, review);
        continue;
      }
      const currentDate = new Date(review.scheduled_at).getTime();
      const existingDate = new Date(existing.scheduled_at).getTime();
      if (Number.isFinite(currentDate) && Number.isFinite(existingDate) && currentDate < existingDate) {
        lessonMap.set(lessonKey, review);
      }
    }
    return Array.from(lessonMap.values()).sort((a, b) => {
      const aDate = new Date(a.scheduled_at).getTime();
      const bDate = new Date(b.scheduled_at).getTime();
      return aDate - bDate;
    });
  }, [normalizedReviews]);
  // =========================================================
  // PENDING REVIEWS
  // =========================================================
  const pendingReviews = useMemo(() => {
    return uniqueDueReviews;
  }, [uniqueDueReviews]);
  // =========================================================
  // FILTERED REVIEWS
  // =========================================================
  const filteredReviews = useMemo(() => {
    if (selectedFilter === "مقرر اليوم") {
      return pendingReviews.filter((review) => review.calculatedStatus === "today");
    }
    if (selectedFilter === "متأخرة") {
      return pendingReviews.filter((review) => review.calculatedStatus === "late");
    }
    return pendingReviews;
  }, [pendingReviews, selectedFilter]);
  // =========================================================
  // UPCOMING REVIEWS
  // =========================================================
  const upcomingReviews = useMemo(() => {
    return normalizedReviews.filter((review) => review.calculatedStatus === "upcoming").sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  }, [normalizedReviews]);
  // =========================================================
  // STATISTICS
  // =========================================================
  const averageMemory = useMemo(() => {
    const directValue = Number(reviewStats?.average_memory_score);
    if (Number.isFinite(directValue) && directValue > 0) {
      return Math.round(directValue);
    }
    const completedScores = reviews.filter((review) => review.completed_at && review.memory_score !== null && review.memory_score !== undefined).map((review) => Number(review.memory_score)).filter((score) => Number.isFinite(score));
    if (!completedScores.length) {
      return 0;
    }
    return Math.round(completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length);
  }, [reviewStats, reviews]);
  const totalLessons = useMemo(() => {
    const uniqueLessons = new Set(reviews.map((review) => review.lesson_id).filter(Boolean));
    return uniqueLessons.size;
  }, [reviews]);
  const completedToday = useMemo(() => {
    const todayKey = getDateKey(getTodayDate());
    const calculated = reviews.filter((review) => review.completed_at && getDateKey(review.completed_at) === todayKey).length;
    const statsValue = Number(reviewStats?.completed_today);
    if (Number.isFinite(statsValue) && statsValue >= 0) {
      return statsValue;
    }
    return calculated;
  }, [getDateKey, getTodayDate, reviewStats, reviews]);
  // =========================================================
  // REVIEW STREAK
  // =========================================================
  const reviewStreak = useMemo(() => {
    const completedDates = [...new Set(reviews.filter((review) => review.completed_at).map((review) => getDateKey(review.completed_at)).filter(Boolean))].sort((a, b) => new Date(b) - new Date(a));
    if (!completedDates.length) {
      return 0;
    }
    const today = getTodayDate();
    const todayKey = getDateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getDateKey(yesterday);
    if (completedDates[0] !== todayKey && completedDates[0] !== yesterdayKey) {
      return 0;
    }
    let streak = 0;
    let cursor = normalizeDate(completedDates[0]);
    for (const dateKey of completedDates) {
      const currentKey = getDateKey(cursor);
      if (dateKey !== currentKey) {
        break;
      }
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [getDateKey, getTodayDate, normalizeDate, reviews]);
  // =========================================================
  // MEMORY DISTRIBUTION
  // =========================================================
  const memoryDistribution = useMemo(() => {
    const scores = reviews.filter((review) => review.completed_at && review.memory_score !== null && review.memory_score !== undefined).map((review) => Number(review.memory_score)).filter((score) => Number.isFinite(score));
    if (!scores.length) {
      return {
        excellent: 0,
        good: 0,
        medium: 0,
        weak: 0,
      };
    }
    const excellent = scores.filter((score) => score >= 90).length;
    const good = scores.filter((score) => score >= 75 && score < 90).length;
    const medium = scores.filter((score) => score >= 60 && score < 75).length;
    const weak = scores.filter((score) => score < 60).length;
    const total = scores.length;
    return {
      excellent: Math.round((excellent / total) * 100),
      good: Math.round((good / total) * 100),
      medium: Math.round((medium / total) * 100),
      weak: Math.round((weak / total) * 100),
    };
  }, [reviews]);
  // =========================================================
  // CALENDAR
  // =========================================================
  const currentMonth = useMemo(() => {
    return new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" }).format(currentMonthDate);
  }, [currentMonthDate]);
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    const previousMonthLastDay = new Date(year, month, 0).getDate();
    const days = [];
    // -----------------------------------------------------
    // Previous month
    // -----------------------------------------------------
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        day: previousMonthLastDay - i,
        muted: true,
      });
    }
    // -----------------------------------------------------
    // Current month
    // -----------------------------------------------------
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = getDateKey(date);
      const reviewed = reviews.some((review) => review.completed_at && getDateKey(review.completed_at) === dateKey);
      const planned = reviews.some((review) => {
        if (review.completed_at) {
          return false;
        }
        if (!review.scheduled_at) {
          return false;
        }
        return getDateKey(review.scheduled_at) === dateKey;
      });
      const today = getTodayDate();
      const isToday = date.getTime() === today.getTime();
      days.push({
        day,
        reviewed,
        planned,
        selected: isToday,
      });
    }
    // -----------------------------------------------------
    // Complete 6 weeks
    // -----------------------------------------------------
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      days.push({
        day,
        muted: true,
      });
    }
    return days;
  }, [currentMonthDate, getDateKey, getTodayDate, reviews]);
  // =========================================================
  // CHANGE MONTH
  // =========================================================
  const changeMonth = useCallback((direction) => {
    setCurrentMonthDate((previous) => {
      const next = new Date(previous);
      if (direction === "next") {
        next.setMonth(next.getMonth() + 1);
      } else {
        next.setMonth(next.getMonth() - 1);
      }
      return next;
    });
  }, []);
  // =========================================================
  // START REVIEW
  // =========================================================
  const startReview = useCallback((review) => {
    if (!review?.id) {
      return;
    }
    if (!review?.lesson_id) {
      console.warn("Review does not have lesson_id", review);
      return;
    }
    navigate("/FocusSession", {
      state: {
        reviewId: review.id,
        subjectId: review.subject_id,
        subjectName: review.subject_name,
        unitId: review.unit_id,
        unitTitle: review.unit_title,
        lessonId: review.lesson_id,
        lessonTitle: review.lesson_title,
        goalType: "review",
        reviewNumber: review.review_number,
        scheduledAt: review.scheduled_at,
        lastScore: review.last_score,
        examTotal: review.exam_total,
        previousMemoryScore: review.memory_score,
        difficulty: review.difficulty,
        notes: review.notes,
      },
    });
  }, [navigate]);
  // =========================================================
  // REFRESH
  // =========================================================
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReviewData();
  };
  // =========================================================
  // ACHIEVEMENT PROGRESS
  // =========================================================
  const achievementsProgress = useMemo(() => {
    return achievements.length ? 100 : 0;
  }, [achievements]);
  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <main className={`review-page ${darkMode ? "dark-mode" : ""}`}>
        <Header />
        <div className="page-loading">
          <div className="page-loading-spinner">
            <FiRefreshCw />
          </div>
          <h3>جاري تحميل بيانات المراجعة...</h3>
          <p>بنجهز بيانات المراجعة الخاصة بدروسك.</p>
        </div>
      </main>
    );
  }
  // =========================================================
  // UI
  // =========================================================
  return (
    <main className="review-page">
      <Header />
      {/* =====================================================
          TOP CONTROLS
      ====================================================== */}
      <section className="review-top-controls">
        <button className="review-select" onClick={() => {
          const filters = ["الكل", "مقرر اليوم", "متأخرة"];
          const currentIndex = filters.indexOf(selectedFilter);
          const nextIndex = currentIndex >= filters.length - 1 ? 0 : currentIndex + 1;
          setSelectedFilter(filters[nextIndex]);
        }}>
          <FaChevronDown />
          {selectedFilter}
        </button>
        <button className="review-filter-button" onClick={handleRefresh} disabled={refreshing}>
          <FaFilter />
          {refreshing ? "جاري التحديث..." : "تحديث"}
        </button>
      </section>
      {/* =====================================================
          ERROR
      ====================================================== */}
      {error && (
        <div style={{
          margin: "15px 0",
          padding: "12px 16px",
          borderRadius: "10px",
          background: "#fff1f1",
          color: "#c62828",
        }}>
          {error}
        </div>
      )}
      {/* =====================================================
          STATISTICS
      ====================================================== */}
      <section className="review-stats">
        <article className="review-stat-card purple">
          <div className="review-stat-icon">
            <FaBolt />
          </div>
          <div className="review-stat-content">
            <h3>سلسلة المراجعة</h3>
            <strong>{reviewStreak}</strong>
            <span>يوم متواصل</span>
          </div>
        </article>
        <article className="review-stat-card orange">
          <div className="review-stat-icon">
            <FaChartLine />
          </div>
          <div className="review-stat-content">
            <h3>معدل الحفظ</h3>
            <strong>{averageMemory}%</strong>
            <span>
              {averageMemory >= 90 ? "ممتاز" : averageMemory >= 75 ? "جيد" : averageMemory >= 60 ? "متوسط" : "يحتاج مراجعة"}
            </span>
          </div>
        </article>
        <article className="review-stat-card blue">
          <div className="review-stat-icon">
            <FaBookOpen />
          </div>
          <div className="review-stat-content">
            <h3>إجمالي الدروس</h3>
            <strong>{totalLessons}</strong>
            <span>دروس</span>
          </div>
        </article>
        <article className="review-stat-card green">
          <div className="review-stat-icon">
            <FaCheckCircle />
          </div>
          <div className="review-stat-content">
            <h3>تمت المراجعة اليوم</h3>
            <strong>{completedToday}</strong>
            <span>دروس</span>
          </div>
        </article>
      </section>
      {/* =====================================================
          MAIN GRID
      ====================================================== */}
      <section className="review-dashboard">
        {/* ===================================================
            LEFT
        ==================================================== */}
        <div className="review-main-column">
          {/* =================================================
              SMART PLAN
          ================================================== */}
          <article className="smart-review-card">
            <div className="section-heading">
              <div>
                <h2>خطة المراجعة الذكية</h2>
                <p>الدروس المستحقة الآن والمراجعات القادمة</p>
              </div>
              <div className="section-heading-icon purple">
                <FaBrain />
              </div>
            </div>
            <div className="smart-review-list">
              {[...pendingReviews, ...upcomingReviews].slice(0, 4).map((review) => (
                <div className="smart-review-item" key={review.id}>
                  <div className={`smart-review-icon ${review.iconType}`}>{review.icon}</div>
                  <div className="smart-review-info">
                    <h3>{review.title}</h3>
                    <span>{review.subject}{" - "}{review.chapter}{" - مراجعة "}{review.review_number}</span>
                  </div>
                  <div className={`smart-review-date ${review.calculatedStatus}`}>
                    {review.date}
                    <small>
                      <FaClock />
                      {review.time}
                    </small>
                  </div>
                </div>
              ))}
              {!pendingReviews.length && !upcomingReviews.length && (
                <div style={{ padding: "25px", textAlign: "center", opacity: 0.7 }}>
                  ممتاز 🎉
                  <br />
                  لا توجد مراجعات مستحقة حاليًا.
                </div>
              )}
            </div>
            {upcomingReviews.length > 0 && (
              <div style={{ padding: "10px 15px", textAlign: "center", opacity: 0.7, fontSize: "13px" }}>
                لديك{" "}{upcomingReviews.length}{" "}مراجعة قادمة.
              </div>
            )}
            <button className="full-plan-button" onClick={() => setSelectedFilter("الكل")}>
              عرض خطة المراجعة الكاملة
              <FaCalendarAlt />
            </button>
          </article>
          {/* =================================================
              PROGRESS + SUBJECTS
          ================================================== */}
          <div className="review-middle-grid">
            {/* -----------------------------------------------
                PROGRESS
            ------------------------------------------------ */}
            <article className="review-progress-card">
              <div className="card-title-row">
                <h2>تقدم المراجعة</h2>
              </div>
              <div className="review-donut" style={{
                background: `conic-gradient(
                    #6c5ce7 ${Math.min(averageMemory, 100)}%,
                    #edf0f5 ${Math.min(averageMemory, 100)}% 100%
                  )`,
              }}>
                <div className="review-donut-inner">
                  <strong>{averageMemory}%</strong>
                  <span>معدل الحفظ</span>
                </div>
              </div>
              <div className="review-progress-legend">
                <div>
                  <span className="legend-dot excellent" />
                  <span>ممتاز</span>
                  <strong>{memoryDistribution.excellent}%</strong>
                </div>
                <div>
                  <span className="legend-dot good" />
                  <span>جيد</span>
                  <strong>{memoryDistribution.good}%</strong>
                </div>
                <div>
                  <span className="legend-dot medium" />
                  <span>متوسط</span>
                  <strong>{memoryDistribution.medium}%</strong>
                </div>
                <div>
                  <span className="legend-dot weak" />
                  <span>ضعيف</span>
                  <strong>{memoryDistribution.weak}%</strong>
                </div>
              </div>
              <button className="help-link">
                كيف يتم حساب معدل الحفظ؟
                <span>؟</span>
              </button>
            </article>
            {/* -----------------------------------------------
                SUBJECT MEMORY
            ------------------------------------------------ */}
            <article className="subject-progress-card">
              <div className="card-title-row">
                <h2>توزيع مستوى الحفظ للمواد</h2>
                <FaLightbulb />
              </div>
              <div className="subject-bars">
                {subjectMemory.map((subject, index) => {
                  const value = Math.round(Number(subject.average_memory_score || 0));
                  const barTypes = ["green", "blue", "orange", "purple", "red"];
                  return (
                    <div className="subject-bar" key={subject.subject_id || `${subject.subject_name}-${index}`}>
                      <span>{subject.subject_name}</span>
                      <div className="bar-track">
                        <span className={`bar-fill ${barTypes[index % barTypes.length]}`} style={{
                          width: `${Math.min(Math.max(value, 0), 100)}%`,
                        }} />
                      </div>
                      <strong>{value}%</strong>
                    </div>
                  );
                })}
                {!subjectMemory.length && (
                  <div style={{ padding: "20px 0", textAlign: "center", opacity: 0.7 }}>
                    لا توجد بيانات حفظ للمواد حتى الآن.
                  </div>
                )}
              </div>
              <button className="subject-details-link">
                عرض تفاصيل المواد
                <FaArrowLeft />
              </button>
            </article>
          </div>
          {/* =================================================
              REVIEW LIST
          ================================================== */}
          <article className="review-list-card">
            <div className="review-list-header">
              <h2>قائمة المراجعة</h2>
              <div className="review-tabs">
                {[
                  `الكل (${pendingReviews.length})`,
                  `مقرر اليوم (${pendingReviews.filter((item) => item.calculatedStatus === "today").length})`,
                  `متأخرة (${pendingReviews.filter((item) => item.calculatedStatus === "late").length})`,
                ].map((tab, index) => (
                  <button key={tab} className={(index === 0 && selectedFilter === "الكل") || (index === 1 && selectedFilter === "مقرر اليوم") || (index === 2 && selectedFilter === "متأخرة") ? "active" : ""} onClick={() => {
                    if (index === 0) {
                      setSelectedFilter("الكل");
                    }
                    if (index === 1) {
                      setSelectedFilter("مقرر اليوم");
                    }
                    if (index === 2) {
                      setSelectedFilter("متأخرة");
                    }
                  }}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="review-items">
              {filteredReviews.map((review) => (
                <div className="review-item" key={review.id}>
                  <button className="review-more" type="button" title="تفاصيل المراجعة">
                    ⋮
                  </button>
                  <div className="review-item-content">
                    <div className={`review-item-icon ${review.iconType}`}>{review.icon}</div>
                    <div className="review-item-info">
                      <h3>{review.title}</h3>
                      <span>{review.subject}{" - "}{review.chapter}{" - مراجعة "}{review.review_number}</span>
                      {/* ---------------------------------
                          Previous score
                      ---------------------------------- */}
                      {review.last_score !== null && review.last_score !== undefined && (
                        <small style={{ display: "block", marginTop: "5px", opacity: 0.75 }}>
                          آخر نتيجة:{" "}
                          <strong>
                            {review.last_score}
                            {review.exam_total ? ` / ${review.exam_total}` : ""}
                          </strong>
                        </small>
                      )}
                      {/* ---------------------------------
                          Memory score
                      ---------------------------------- */}
                      {review.memory_score !== null && review.memory_score !== undefined && (
                        <small style={{ display: "block", marginTop: "3px", opacity: 0.75 }}>
                          آخر تقييم حفظ:{" "}
                          <strong>
                            {review.memory_score}%
                          </strong>
                        </small>
                      )}
                    </div>
                    <div className={`review-item-status ${review.calculatedStatus}`}>
                      {review.calculatedStatus === "today" ? "مراجعة اليوم" : "متأخرة"}
                      <small>{review.date}</small>
                      <small>{review.time}</small>
                    </div>
                    <button className={`review-action ${review.calculatedStatus}`} onClick={() => startReview(review)}>
                      {review.action}
                    </button>
                  </div>
                </div>
              ))}
              {!filteredReviews.length && (
                <div style={{ padding: "40px 20px", textAlign: "center", opacity: 0.7 }}>
                  <FaCheckCircle style={{ fontSize: "32px", marginBottom: "10px" }} />
                  <div>
                    {selectedFilter === "متأخرة" ? "مفيش مراجعات متأخرة 🎉" : selectedFilter === "مقرر اليوم" ? "خلصت مراجعات اليوم 🎉" : "مفيش مراجعات مستحقة حاليًا 🎉"}
                  </div>
                </div>
              )}
            </div>
            <button className="show-all-reviews" onClick={() => setSelectedFilter("الكل")}>
              عرض جميع المراجعات
              <FaArrowLeft />
            </button>
          </article>
          {/* =================================================
              TOOLS
          ================================================== */}
          <section className="review-tools">
            <h2>أدوات المراجعة</h2>
            <div className="review-tools-grid">
              <article className="tool-card maps">
                <FaMap />
                <h3>خرائط ذهنية</h3>
                <p>اربط المفاهيم معًا بطريقة سهلة</p>
                <button>عرض الخرائط</button>
              </article>
              <article className="tool-card notes">
                <FaClipboardList />
                <h3>ملخصات سريعة</h3>
                <p>ملخصات جاهزة لكل درس</p>
                <button>عرض الملخصات</button>
              </article>
              <article className="tool-card quizzes">
                <FaCheckCircle />
                <h3>اختبر نفسك</h3>
                <p>اختبر معلوماتك بعد المراجعة</p>
                <button>بدء الاختبار</button>
              </article>
              <article className="tool-card flashcards">
                <FaBookOpen />
                <h3>البطاقات الذكية</h3>
                <p>راجع أهم النقاط بسرعة</p>
                <button>ابدأ الآن</button>
              </article>
            </div>
          </section>
        </div>
        {/* ===================================================
            RIGHT SIDEBAR
        ==================================================== */}
        <aside className="review-sidebar">
          {/* =================================================
              CALENDAR
          ================================================== */}
          <article className="calendar-card">
            <div className="calendar-header">
              <button onClick={() => changeMonth("next")}>
                <FaChevronRight />
              </button>
              <h2>{currentMonth}</h2>
              <button onClick={() => changeMonth("prev")}>
                <FaChevronLeft />
              </button>
            </div>
            <div className="calendar-week">
              {["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarDays.map((item, index) => (
                <span key={`${item.day}-${index}`} className={[
                  item.muted ? "muted" : "",
                  item.reviewed ? "reviewed" : "",
                  item.planned ? "planned" : "",
                  item.selected ? "selected" : "",
                ].filter(Boolean).join(" ")}>
                  {item.day}
                </span>
              ))}
            </div>
            <div className="calendar-legend">
              <span>
                <i className="legend-review" />
                مراجعة تمت
              </span>
              <span>
                <i className="legend-planned" />
                مراجعة مجدولة
              </span>
              <span>
                <i className="legend-empty" />
                بدون مراجعة
              </span>
            </div>
            <button className="calendar-full-button">
              عرض الجدول الكامل
              <FaArrowLeft />
            </button>
          </article>
          {/* =================================================
              TIPS
          ================================================== */}
          <article className="review-tips-card">
            <div className="tips-heading">
              <FaLightbulb />
              <h2>نصائح للمراجعة الفعالة</h2>
            </div>
            <ul>
              <li>راجع الدروس في الوقت المحدد لتحقيق أفضل ثبات للمعلومة.</li>
              <li>استخدم أسئلة الاختبار بعد كل مراجعة.</li>
              <li>لا تكتفِ بالمراجعة فقط، حاول استرجاع المعلومات.</li>
            </ul>
            <button>عرض كل النصائح</button>
          </article>
          {/* =================================================
              ACHIEVEMENTS
          ================================================== */}
          <article className="achievements-card">
            <div className="card-title-row">
              <h2>الإنجازات</h2>
              <FaTrophy />
            </div>
            {achievements.slice(0, 3).map((achievement, index) => (
              <div className="achievement-item" key={achievement.achievement_id || index}>
                <div className={`achievement-icon ${index === 0 ? "green" : index === 1 ? "blue" : "gold"}`}>
                  {index === 0 ? <FaCheck /> : index === 1 ? <FaBookOpen /> : <FaTrophy />}
                </div>
                <div>
                  <strong>{achievement.title}</strong>
                  <span>{achievement.description}</span>
                </div>
                <FaCheckCircle />
              </div>
            ))}
            {!achievements.length && (
              <div className="achievement-item">
                <div className="achievement-icon green">
                  <FaCheck />
                </div>
                <div>
                  <strong>ابدأ رحلة الإنجازات</strong>
                  <span>أكمل المراجعات لتحصل على أول إنجاز.</span>
                </div>
                <FaLock />
              </div>
            )}
            <div className="achievement-progress">
              <div>
                <span>{achievementsProgress}%</span>
                <small>إنجازاتك</small>
              </div>
              <div className="achievement-progress-track">
                <span style={{ width: `${achievementsProgress}%` }} />
              </div>
            </div>
            <button>عرض كل الإنجازات</button>
          </article>
        </aside>
      </section>
    </main>
  );
};

export default Review;