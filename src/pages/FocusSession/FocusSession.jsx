import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FaBrain,
  FaBookOpen,
  FaCog,
  FaPlay,
  FaPause,
  FaRedo,
  FaStop,
  FaStopwatch,
  FaCheckCircle,
  FaChartBar,
  FaClock,
  FaChevronRight,
  FaCheck,
  FaSmile,
  FaMeh,
  FaFrown,
  FaLightbulb,
  FaChartPie,
  FaTimes,
  FaLeaf,
  FaSearch,
  FaBook,
  FaQuestionCircle,
  FaLayerGroup,
} from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import { supabase } from "../../utils/supabaseClient";
import "./FocusSession.css";
const MODES = {
  "50/10": {
    focus: 50 * 60,
    break: 10 * 60,
  },
  "25/5": {
    focus: 25 * 60,
    break: 5 * 60,
  },
  open: {
    focus: 0,
    break: 0,
  },
};
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
const formatTimer = (totalSeconds = 0) => {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};
const formatTimeOfDay = (dateValue) => {
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
const getPriorityText = (index) => {
  if (index === 0) {
    return "أولوية عالية";
  }
  if (index === 1) {
    return "أولوية متوسطة";
  }
  return "أولوية عادية";
};
const getIconComponent = (iconName) => {
  const icons = {
    FaBook,
    FaBookOpen,
    FaBrain,
    FaLeaf,
  };
  return icons[iconName] || FaBookOpen;
};
const FocusSession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const reviewState = location.state || {};
  const reviewId = reviewState.reviewId || null;
  const reviewSubjectId = reviewState.subjectId || null;
  const reviewUnitId = reviewState.unitId || null;
  const reviewLessonId = reviewState.lessonId || null;
  const reviewSubjectName = reviewState.subjectName || "";
  const reviewUnitTitle = reviewState.unitTitle || "";
  const reviewLessonTitle = reviewState.lessonTitle || "";
  const reviewGoalType = reviewState.goalType || "";
  const cameFromReview = Boolean(reviewId);
  const [sessionType, setSessionType] = useState("focus");
  const [selectedMode, setSelectedMode] = useState("50/10");
  const [secondsLeft, setSecondsLeft] = useState(MODES["50/10"].focus);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [sessionSaving, setSessionSaving] = useState(false);
  const sessionIdRef = useRef(null);
  const sessionStartedAtRef = useRef(null);
  const elapsedSecondsRef = useRef(0);
  const creatingSessionRef = useRef(false);
  const finishingTimerRef = useRef(false);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectsError, setSubjectsError] = useState("");
  const [goalOpen, setGoalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(reviewSubjectId || "");
  const [selectedGoalType, setSelectedGoalType] = useState(reviewGoalType || "");
  const [selectedLesson, setSelectedLesson] = useState(reviewLessonId || "");
  const [selectedUnit, setSelectedUnit] = useState(reviewUnitId || "");
  const [focusLevel, setFocusLevel] = useState("high");
  const [feedback, setFeedback] = useState("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [todayStats, setTodayStats] = useState({
    focus_seconds: 0,
    break_seconds: 0,
    focus_sessions: 0,
    completed_sessions: 0,
    partial_sessions: 0,
    average_focus_seconds: 0,
  });
  const [previousSessions, setPreviousSessions] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const goalTypes = useMemo(
    () => [
      {
        id: "study",
        title: "مذاكرة درس",
        description: "ذاكر درس جديد أو درس متأخر",
        icon: <FaBookOpen />,
      },
      {
        id: "review",
        title: "مراجعة درس",
        description: "راجع درس سبق دراسته",
        icon: <FaRedo />,
      },
      {
        id: "questions",
        title: "حل أسئلة",
        description: "اختبر فهمك وحل تدريبات",
        icon: <FaQuestionCircle />,
      },
    ],
    []
  );
  const fetchSubjects = useCallback(async () => {
    try {
      setLoadingSubjects(true);
      setSubjectsError("");

      // ==========================================
      // 1️⃣ المستخدم الحالي
      // ==========================================
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }

      // ==========================================
      // 2️⃣ بيانات الطالب
      // ==========================================
      const { data: profileData, error: profileError } =
        await supabase
          .from("student_profiles")
          .select(`
            id,
            user_id,
            section,
            grade_level,
            education_system,
            track
          `)
          .eq("user_id", user.id)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        throw new Error("لم يتم العثور على بيانات الطالب");
      }

      const gradeLevel = profileData.grade_level?.trim() || "";
      const educationSystem =
        profileData.education_system?.trim() || "";
      const studentTrack = profileData.track?.trim() || "";
      const studentSection = profileData.section?.trim() || "";

      if (!gradeLevel) {
        throw new Error("لم يتم تحديد الصف الدراسي للطالب");
      }

      if (!educationSystem) {
        throw new Error("لم يتم تحديد نظام التعليم للطالب");
      }

      // ==========================================
      // 3️⃣ تحديد المواد حسب نظام المنهج
      // ==========================================
      let subjectsData = [];

      // ==========================================
      // 🟢 الأول والثاني الثانوي
      // subject_curriculum_access
      // ==========================================
      if (
        gradeLevel === "first_secondary" ||
        gradeLevel === "second_secondary"
      ) {
        let accessQuery = supabase
          .from("subject_curriculum_access")
          .select(`
            subject_id,
            grade_level,
            education_system,
            track,
            subjects (
              id,
              name,
              subtitle,
              icon,
              icon_class,
              is_active,
              type,
              slug
            )
          `)
          .eq("grade_level", gradeLevel)
          .eq("education_system", educationSystem);

        // ------------------------------------------
        // لو عند الطالب Track
        // ------------------------------------------
        if (studentTrack) {
          accessQuery = accessQuery.or(
            `track.eq.${studentTrack},track.is.null`
          );
        } else {
          accessQuery = accessQuery.is("track", null);
        }

        const {
          data: accessData,
          error: accessError,
        } = await accessQuery;

        if (accessError) {
          throw accessError;
        }

        const subjectsMap = new Map();

        (accessData || []).forEach((item) => {
          const subject = item.subjects;

          if (!subject || !subject.is_active) {
            return;
          }

          subjectsMap.set(subject.id, subject);
        });

        subjectsData = Array.from(subjectsMap.values());
      }

      // ==========================================
      // 🔵 الثالث الثانوي
      // sections + subject_sections
      // ==========================================
      else if (gradeLevel === "third_secondary") {
        if (!studentSection) {
          throw new Error("لم يتم تحديد شعبة الطالب");
        }

        const {
          data: sectionData,
          error: sectionError,
        } = await supabase
          .from("sections")
          .select("id, name")
          .eq("name", studentSection)
          .maybeSingle();

        if (sectionError) {
          throw sectionError;
        }

        if (!sectionData) {
          throw new Error(
            `لم يتم العثور على الشعبة "${studentSection}" في جدول الشعب`
          );
        }

        const {
          data: subjectSectionsData,
          error: subjectSectionsError,
        } = await supabase
          .from("subject_sections")
          .select(`
            subject_id,
            section_id,
            subjects (
              id,
              name,
              subtitle,
              icon,
              icon_class,
              is_active,
              type,
              slug
            )
          `)
          .eq("section_id", sectionData.id);

        if (subjectSectionsError) {
          throw subjectSectionsError;
        }

        const subjectsMap = new Map();

        (subjectSectionsData || []).forEach((item) => {
          const subject = item.subjects;

          if (!subject || !subject.is_active) {
            return;
          }

          subjectsMap.set(subject.id, subject);
        });

        subjectsData = Array.from(subjectsMap.values());
      }

      // ==========================================
      // 🟠 fallback
      // ==========================================
      else {
        throw new Error("الصف الدراسي غير مدعوم حاليًا");
      }

      // ==========================================
      // 4️⃣ لا توجد مواد
      // ==========================================
      if (subjectsData.length === 0) {
        setSubjects([]);
        return;
      }

      // ==========================================
      // 5️⃣ IDs المواد
      // ==========================================
      const subjectIds = subjectsData.map(
        (subject) => subject.id
      );

      // ==========================================
      // 6️⃣ جلب الوحدات من المنهج الجديد
      // لجميع الصفوف
      // ==========================================
      const {
        data: unitsData,
        error: unitsError,
      } = await supabase
        .from("units")
        .select(`
          id,
          subject_id,
          title,
          sort_order,
          parent_unit_id,
          is_active
        `)
        .in("subject_id", subjectIds)
        .eq("is_active", true)
        .order("sort_order", {
          ascending: true,
        });

      if (unitsError) {
        throw unitsError;
      }

      const units = unitsData || [];

      // ==========================================
      // 7️⃣ جلب الدروس
      // ==========================================
      const unitIds = units.map(
        (unit) => unit.id
      );

      let lessonsData = [];

      if (unitIds.length > 0) {
        const {
          data,
          error: lessonsError,
        } = await supabase
          .from("lessons")
          .select(`
            id,
            unit_id,
            title,
            sort_order,
            is_active
          `)
          .in("unit_id", unitIds)
          .eq("is_active", true)
          .order("sort_order", {
            ascending: true,
          });

        if (lessonsError) {
          throw lessonsError;
        }

        lessonsData = data || [];
      }

      // ==========================================
      // 8️⃣ تجميع الدروس داخل الوحدات
      // ==========================================
      const lessonsByUnit = {};

      lessonsData.forEach((lesson) => {
        if (!lessonsByUnit[lesson.unit_id]) {
          lessonsByUnit[lesson.unit_id] = [];
        }

        lessonsByUnit[lesson.unit_id].push(lesson);
      });

      // ==========================================
      // 9️⃣ تجميع الوحدات داخل المواد
      // ==========================================
      const unitsBySubject = {};

      units.forEach((unit) => {
        if (!unitsBySubject[unit.subject_id]) {
          unitsBySubject[unit.subject_id] = [];
        }

        unitsBySubject[unit.subject_id].push({
          ...unit,
          lessons: lessonsByUnit[unit.id] || [],
        });
      });

      // ==========================================
      // 🔟 تجهيز المواد للصفحة
      // ==========================================
      const formattedSubjects = subjectsData
        .map((subject) => {
          const allSubjectUnits =
            unitsBySubject[subject.id] || [];

          // ------------------------------------------
          // الوحدات الرئيسية
          // ------------------------------------------
          const mainUnits = allSubjectUnits.filter(
            (unit) => !unit.parent_unit_id
          );

          // ------------------------------------------
          // كل الدروس
          // ------------------------------------------
          const lessons = allSubjectUnits.flatMap(
            (unit) =>
              (unit.lessons || []).map((lesson) => ({
                ...lesson,

                // مهم جدًا لأن FocusSession
                // يستخدمهم في اختيار الدرس
                unitId: unit.id,
                unitTitle: unit.title,

                parentUnitId:
                  unit.parent_unit_id || null,
              }))
          );

          return {
            ...subject,

            description:
              subject.subtitle ||
              "اختر المادة وابدأ جلسة تركيز جديدة",

            // الوحدات الرئيسية
            units: mainUnits,

            // جميع الوحدات
            allUnits: allSubjectUnits,

            // جميع الدروس
            lessons,
          };
        })
        .sort((a, b) =>
          String(a.name || "").localeCompare(
            String(b.name || ""),
            "ar"
          )
        );

      setSubjects(formattedSubjects);
    } catch (error) {
      console.error(
        "fetchSubjects error:",
        error
      );

      setSubjectsError(
        error?.message ||
          "حدث خطأ أثناء تحميل المواد والوحدات والدروس"
      );

      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  }, []);
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);
  const selectedSubjectData = useMemo(() => {
    return subjects.find(
      (subject) => String(subject.id) === String(selectedSubject)
    );
  }, [subjects, selectedSubject]);
  const selectedLessonData = useMemo(() => {
    if (!selectedSubjectData || !selectedLesson) {
      return null;
    }
    return (
      selectedSubjectData.lessons.find(
        (lesson) => String(lesson.id) === String(selectedLesson)
      ) || null
    );
  }, [selectedSubjectData, selectedLesson]);
  const selectedUnitData = useMemo(() => {
    if (!selectedSubjectData || !selectedUnit) {
      return null;
    }

    return (
      selectedSubjectData.allUnits?.find(
        (unit) =>
          String(unit.id) === String(selectedUnit)
      ) || null
    );
  }, [selectedSubjectData, selectedUnit]);
  useEffect(() => {
    if (!cameFromReview || !subjects.length || !reviewSubjectId) {
      return;
    }
    const subject = subjects.find(
      (item) => String(item.id) === String(reviewSubjectId)
    );
    if (!subject) {
      return;
    }
    setSelectedSubject(reviewSubjectId);
    setSelectedGoalType(reviewGoalType || "review");
    setSelectedUnit(reviewUnitId || "");
    setSelectedLesson(reviewLessonId || "");
    setGoalOpen(false);
  }, [
    cameFromReview,
    subjects,
    reviewSubjectId,
    reviewUnitId,
    reviewLessonId,
    reviewGoalType,
  ]);
  const validateGoal = useCallback(() => {
    if (!selectedSubject) {
      return {
        valid: false,
        message: "اختر المادة أولاً",
      };
    }
    if (!selectedGoalType) {
      return {
        valid: false,
        message: "اختر هدف الجلسة أولاً",
      };
    }
    if (selectedGoalType !== "questions" && !selectedLesson) {
      return {
        valid: false,
        message: "اختر الدرس الذي تريد مذاكرته",
      };
    }
    if (selectedGoalType === "questions" && !selectedLesson && !selectedUnit) {
      return {
        valid: true,
        message: "",
      };
    }
    return {
      valid: true,
      message: "",
    };
  }, [
    selectedSubject,
    selectedGoalType,
    selectedLesson,
    selectedUnit,
  ]);
  const isSessionGoalValid = useMemo(() => {
    return validateGoal().valid;
  }, [validateGoal]);
  const goalText = useMemo(() => {
    if (!selectedSubjectData) {
      return {
        title: "اختر هدف الجلسة",
        subtitle: "حدد المادة والدرس الذي تريد التركيز عليه",
      };
    }
    if (!selectedGoalType) {
      return {
        title: `مذاكرة ${selectedSubjectData.name}`,
        subtitle: "اختر نوع الهدف",
      };
    }
    const goal = goalTypes.find(
      (item) => item.id === selectedGoalType
    );
    if (selectedGoalType === "questions") {
      if (selectedLessonData) {
        return {
          title: `حل أسئلة - ${selectedLessonData.title}`,
          subtitle: selectedSubjectData.name,
        };
      }
      if (selectedUnitData) {
        return {
          title: `حل أسئلة - ${selectedUnitData.title}`,
          subtitle: selectedSubjectData.name,
        };
      }
      return {
        title: `حل أسئلة - ${selectedSubjectData.name}`,
        subtitle: "أسئلة شاملة من المادة",
      };
    }
    if (selectedLessonData) {
      return {
        title: `${goal?.title || ""} ${selectedLessonData.title}`,
        subtitle: selectedSubjectData.name,
      };
    }
    return {
      title: `${goal?.title || ""} ${selectedSubjectData.name}`,
      subtitle: "اختر الدرس من القائمة",
    };
  }, [
    selectedSubjectData,
    selectedGoalType,
    selectedLessonData,
    selectedUnitData,
    goalTypes,
  ]);
  const resetGoal = () => {
    if (currentSessionId) {
      return;
    }
    setSelectedSubject("");
    setSelectedGoalType("");
    setSelectedLesson("");
    setSelectedUnit("");
  };
  const handleSubjectSelect = (subjectId) => {
    if (currentSessionId) {
      return;
    }
    setSelectedSubject(subjectId);
    setSelectedGoalType("");
    setSelectedLesson("");
    setSelectedUnit("");
  };
  const handleGoalTypeSelect = (goalType) => {
    if (currentSessionId) {
      return;
    }
    setSelectedGoalType(goalType);
    setSelectedLesson("");
    setSelectedUnit("");
  };
  const handleLessonSelect = (lessonId) => {
    if (currentSessionId) {
      return;
    }
    const lesson = selectedSubjectData?.lessons.find(
      (item) => String(item.id) === String(lessonId)
    );
    setSelectedLesson(lessonId);
    setSelectedUnit(lesson?.unitId || "");
  };
  const handleUnitSelect = (unitId) => {
    if (currentSessionId) {
      return;
    }
    setSelectedUnit(unitId);
    setSelectedLesson("");
  };
  const confirmGoal = () => {
    const validation = validateGoal();
    if (!validation.valid) {
      window.alert(validation.message);
      return;
    }
    setGoalOpen(false);
  };
  const fetchTodayStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        throw userError;
      }
      if (!user) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        0
      );
      const {
        data: sessionsData,
        error: sessionsError,
      } = await supabase
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
        .gte("started_at", startOfToday.toISOString())
        .lt("started_at", endOfToday.toISOString())
        .order("started_at", {
          ascending: false,
        });
      if (sessionsError) {
        throw sessionsError;
      }
      const sessions = sessionsData || [];
      const focusSessions = sessions.filter(
        (session) =>
          session.session_type === "focus" &&
          session.status !== "cancelled"
      );
      const breakSessions = sessions.filter(
        (session) =>
          session.session_type === "break" &&
          session.status !== "cancelled"
      );
      const focusSeconds = focusSessions.reduce(
        (total, session) =>
          total +
          Math.max(
            0,
            Number(session.actual_seconds) || 0
          ),
        0
      );
      const breakSeconds = breakSessions.reduce(
        (total, session) =>
          total +
          Math.max(
            0,
            Number(session.actual_seconds) || 0
          ),
        0
      );
      const completedFocusSessions = focusSessions.filter(
        (session) => session.status === "completed"
      );
      const partialFocusSessions = focusSessions.filter(
        (session) => session.status === "partial"
      );
      const partialByGoalResult = focusSessions.filter(
        (session) => session.goal_result === "partial"
      );
      const completedCount = completedFocusSessions.length;
      const partialCount = Math.max(
        partialFocusSessions.length,
        partialByGoalResult.length
      );
      const averageFocusSeconds =
        focusSessions.length > 0
          ? Math.round(
              focusSeconds / focusSessions.length
            )
          : 0;
      setTodayStats({
        focus_seconds: focusSeconds,
        break_seconds: breakSeconds,
        focus_sessions: focusSessions.length,
        completed_sessions: completedCount,
        partial_sessions: partialCount,
        average_focus_seconds: averageFocusSeconds,
      });
      setCompletedSessions(completedCount);
      const previousData = focusSessions
        .slice(0, 5)
        .map((session) => {
          const subject = subjects.find(
            (item) =>
              String(item.id) ===
              String(session.subject_id)
          );
          let lessonTitle = "";
          let unitTitle = "";
          if (subject) {
            const lesson = subject.lessons?.find(
              (item) =>
                String(item.id) ===
                String(session.lesson_id)
            );
            if (lesson) {
              lessonTitle = lesson.title || "";
              unitTitle = lesson.unitTitle || "";
            }
            if (!unitTitle) {
              const unit = subject.units?.find(
                (item) =>
                  String(item.id) ===
                  String(session.unit_id)
              );
              if (unit) {
                unitTitle = unit.title || "";
              }
            }
          }
          return {
            ...session,
            subject_name: subject?.name || "جلسة تركيز",
            lesson_title: lessonTitle,
            unit_title: unitTitle,
          };
        });
      setPreviousSessions(previousData);
      const distributionMap = {};
      focusSessions.forEach((session) => {
        const subjectId = session.subject_id || "unknown";
        if (!distributionMap[subjectId]) {
          const subject = subjects.find(
            (item) =>
              String(item.id) ===
              String(subjectId)
          );
          distributionMap[subjectId] = {
            subject_id: subjectId,
            subject_name: subject?.name || "بدون مادة",
            focus_seconds: 0,
          };
        }
        distributionMap[subjectId].focus_seconds += Math.max(
          0,
          Number(session.actual_seconds) || 0
        );
      });
      const distributionData = Object.values(distributionMap).sort(
        (a, b) => b.focus_seconds - a.focus_seconds
      );
      const mappedDistribution = distributionData.map(
        (item, index) => {
          const percentage =
            focusSeconds > 0
              ? Math.round(
                  (item.focus_seconds / focusSeconds) *
                    100
                )
              : 0;
          return {
            subject: item.subject_name,
            time: formatDuration(item.focus_seconds),
            percentage: `${percentage}%`,
            className:
              [
                "physics",
                "chemistry",
                "arabic",
                "biology",
              ][index] || "physics",
            focus_seconds: item.focus_seconds,
          };
        }
      );
      setDistribution(mappedDistribution);
    } catch (error) {
      console.error("fetchTodayStats error:", error);
      setTodayStats({
        focus_seconds: 0,
        break_seconds: 0,
        focus_sessions: 0,
        completed_sessions: 0,
        partial_sessions: 0,
        average_focus_seconds: 0,
      });
      setPreviousSessions([]);
      setDistribution([]);
    } finally {
      setLoadingStats(false);
    }
  }, [subjects]);
  useEffect(() => {
    fetchTodayStats();
  }, [fetchTodayStats]);
  useEffect(() => {
    if (currentSessionId) {
      return;
    }
    setIsRunning(false);
    setSessionType("focus");
    setSessionFinished(false);
    setFeedback("");
    setFeedbackNote("");
    elapsedSecondsRef.current = 0;
    finishingTimerRef.current = false;
    setSecondsLeft(
      selectedMode === "open"
        ? 0
        : MODES[selectedMode].focus
    );
  }, [selectedMode, currentSessionId]);
  const createFocusSession = useCallback(async () => {
    const validation = validateGoal();
    if (!validation.valid) {
      window.alert(validation.message);
      setGoalOpen(true);
      return null;
    }
    if (currentSessionId) {
      return currentSessionId;
    }
    if (creatingSessionRef.current) {
      return null;
    }
    try {
      creatingSessionRef.current = true;
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        throw userError;
      }
      if (!user) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }
      const clientStartedAt = new Date().toISOString();
      const plannedSeconds = Number(
        MODES[selectedMode]?.[sessionType]
      ) || 0;
      const insertPayload = {
        user_id: user.id,
        subject_id: selectedSubject,
        unit_id: selectedUnit || null,
        lesson_id: selectedLesson || null,
        review_id: reviewId || null,
        session_type: sessionType,
        goal_type: selectedGoalType,
        timer_mode: selectedMode,
        started_at: clientStartedAt,
        ended_at: null,
        planned_seconds: plannedSeconds,
        actual_seconds: 0,
        status: "active",
      };
      const {
        data,
        error,
      } = await supabase
        .from("study_focus_sessions")
        .insert(insertPayload)
        .select("id, started_at")
        .single();
      if (error) {
        throw error;
      }
      if (!data?.id) {
        throw new Error("لم يتم إنشاء جلسة التركيز");
      }
      setCurrentSessionId(data.id);
      sessionIdRef.current = data.id;
      const dbStartedAt = data.started_at || clientStartedAt;
      setSessionStartedAt(dbStartedAt);
      sessionStartedAtRef.current = dbStartedAt;
      elapsedSecondsRef.current = 0;
      return data.id;
    } catch (error) {
      console.error("createFocusSession error:", error);
      window.alert(error?.message || "حدث خطأ أثناء بدء جلسة التركيز");
      return null;
    } finally {
      creatingSessionRef.current = false;
    }
  }, [
    validateGoal,
    currentSessionId,
    selectedMode,
    sessionType,
    selectedSubject,
    selectedUnit,
    selectedLesson,
    selectedGoalType,
    reviewId,
  ]);
  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (selectedMode === "open") {
          elapsedSecondsRef.current += 1;
          return prev + 1;
        }
        if (prev <= 1) {
          window.clearInterval(timer);
          setIsRunning(false);
          elapsedSecondsRef.current += 1;
          if (sessionType === "focus") {
            if (!finishingTimerRef.current) {
              finishingTimerRef.current = true;
              setSessionFinished(true);
            }
            return 0;
          }
          setSessionType("focus");
          elapsedSecondsRef.current = 0;
          return MODES[selectedMode].focus;
        }
        elapsedSecondsRef.current += 1;
        return prev - 1;
      });
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [isRunning, sessionType, selectedMode]);
  const getActualSessionSeconds = useCallback(() => {
    return Math.max(
      0,
      Math.floor(
        Number(elapsedSecondsRef.current) || 0
      )
    );
  }, []);
  const pauseDatabaseSession = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      return;
    }
    const actualSeconds = getActualSessionSeconds();
    const { error } = await supabase
      .from("study_focus_sessions")
      .update({
        status: "paused",
        actual_seconds: actualSeconds,
      })
      .eq("id", sessionId);
    if (error) {
      console.error("pauseDatabaseSession error:", error);
    }
  }, [getActualSessionSeconds]);
  const resumeDatabaseSession = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      return;
    }
    const { error } = await supabase
      .from("study_focus_sessions")
      .update({
        status: "active",
        actual_seconds: getActualSessionSeconds(),
      })
      .eq("id", sessionId);
    if (error) {
      console.error("resumeDatabaseSession error:", error);
    }
  }, [getActualSessionSeconds]);
  const toggleTimer = async () => {
    if (sessionFinished || sessionSaving) {
      return;
    }
    if (isRunning) {
      setIsRunning(false);
      await pauseDatabaseSession();
      return;
    }
    const validation = validateGoal();
    if (!validation.valid) {
      setGoalOpen(true);
      window.alert(validation.message);
      return;
    }
    if (selectedMode !== "open" && secondsLeft <= 0) {
      setSecondsLeft(MODES[selectedMode][sessionType]);
      elapsedSecondsRef.current = 0;
      finishingTimerRef.current = false;
    }
    let sessionId = sessionIdRef.current;
    if (!sessionId) {
      sessionId = await createFocusSession();
    } else {
      await resumeDatabaseSession();
    }
    if (!sessionId) {
      return;
    }
    setSessionFinished(false);
    finishingTimerRef.current = false;
    setIsRunning(true);
  };
  const resetTimer = async () => {
    if (sessionSaving) {
      return;
    }
    setIsRunning(false);
    const sessionId = sessionIdRef.current;
    if (sessionId) {
      try {
        setSessionSaving(true);
        const { error } = await supabase.rpc("cancel_focus_session", {
          p_session_id: sessionId,
          p_actual_seconds: getActualSessionSeconds(),
        });
        if (error) {
          throw error;
        }
      } catch (error) {
        console.error("resetTimer cancel error:", error);
        window.alert(error?.message || "حدث خطأ أثناء إعادة ضبط الجلسة");
      } finally {
        setSessionSaving(false);
      }
    }
    setCurrentSessionId(null);
    sessionIdRef.current = null;
    setSessionStartedAt(null);
    sessionStartedAtRef.current = null;
    elapsedSecondsRef.current = 0;
    finishingTimerRef.current = false;
    setSessionType("focus");
    setSessionFinished(false);
    setFeedback("");
    setFeedbackNote("");
    setSecondsLeft(
      selectedMode === "open"
        ? 0
        : MODES[selectedMode].focus
    );
    await fetchTodayStats();
  };
  const finishSession = () => {
    if (sessionSaving) {
      return;
    }
    if (!sessionIdRef.current) {
      return;
    }
    setIsRunning(false);
    setSessionFinished(true);
  };
  const cancelSession = async () => {
    if (sessionSaving) {
      return;
    }
    setIsRunning(false);
    const sessionId = sessionIdRef.current;
    try {
      if (sessionId) {
        setSessionSaving(true);
        const { error } = await supabase.rpc("cancel_focus_session", {
          p_session_id: sessionId,
          p_actual_seconds: getActualSessionSeconds(),
        });
        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error("cancelSession error:", error);
      window.alert(error?.message || "حدث خطأ أثناء إلغاء الجلسة");
      return;
    } finally {
      setSessionSaving(false);
    }
    setCurrentSessionId(null);
    sessionIdRef.current = null;
    setSessionStartedAt(null);
    sessionStartedAtRef.current = null;
    elapsedSecondsRef.current = 0;
    finishingTimerRef.current = false;
    setSessionType("focus");
    setSessionFinished(false);
    setFeedback("");
    setFeedbackNote("");
    setSecondsLeft(
      selectedMode === "open"
        ? 0
        : MODES[selectedMode].focus
    );
    await fetchTodayStats();
  };
  const changeSessionType = async (type) => {
    if (currentSessionId) {
      return;
    }
    if (type === "break") {
      const validation = validateGoal();
      if (!validation.valid) {
        setGoalOpen(true);
        window.alert("اختر هدف الجلسة أولاً قبل بدء الراحة");
        return;
      }
    }
    setIsRunning(false);
    setSessionFinished(false);
    setFeedback("");
    setFeedbackNote("");
    setSessionType(type);
    elapsedSecondsRef.current = 0;
    finishingTimerRef.current = false;
    setSecondsLeft(
      selectedMode === "open"
        ? 0
        : MODES[selectedMode][type]
    );
  };
  const completeSession = async () => {
    if (sessionSaving) {
      return;
    }
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      setSessionFinished(false);
      return;
    }
    if (!feedback) {
      window.alert("اختر هل أنجزت هدف الجلسة أولاً");
      return;
    }
    try {
      setSessionSaving(true);
      setIsRunning(false);
      const actualSeconds = getActualSessionSeconds();
      if (actualSeconds <= 0) {
        window.alert("لا يمكن حفظ جلسة بدون وقت تركيز.");
        return;
      }
      const {
        data,
        error,
      } = await supabase.rpc("complete_focus_session", {
        p_session_id: sessionId,
        p_actual_seconds: actualSeconds,
        p_goal_result: feedback,
        p_focus_level: focusLevel || null,
        p_feedback_note: feedbackNote?.trim() || null,
      });
      if (error) {
        throw error;
      }
      if (reviewId) {
        const {
          error: reviewError,
        } = await supabase.rpc("complete_lesson_review", {
          review_id: reviewId,
          p_memory_score: null,
          p_difficulty: null,
          p_notes: feedbackNote?.trim() || null,
        });
        if (reviewError) {
          console.error(
            "complete lesson review error:",
            reviewError
          );
        }
      }
      console.log("Focus session completed:", data);
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            150
          )
      );
      await fetchTodayStats();
      setCurrentSessionId(null);
      sessionIdRef.current = null;
      setSessionStartedAt(null);
      sessionStartedAtRef.current = null;
      elapsedSecondsRef.current = 0;
      finishingTimerRef.current = false;
      setSessionFinished(false);
      setFeedback("");
      setFeedbackNote("");
      setIsRunning(false);
      setSessionType("focus");
      setSecondsLeft(
        selectedMode === "open"
          ? 0
          : MODES[selectedMode].focus
      );
      if (reviewId) {
        navigate("/Review", {
          replace: true,
        });
        return;
      }
    } catch (error) {
      console.error("completeSession error:", error);
      window.alert(error?.message || "حدث خطأ أثناء حفظ الجلسة");
    } finally {
      setSessionSaving(false);
    }
  };
  const saveFeedback = async () => {
    if (!feedback) {
      window.alert("اختر نتيجة الجلسة أولاً");
      return;
    }
    await completeSession();
  };
  const formattedTime = useMemo(() => {
    return formatTimer(secondsLeft);
  }, [secondsLeft]);
  const totalSeconds = Number(MODES[selectedMode]?.[sessionType]) || 0;
  const progress =
    selectedMode === "open"
      ? Math.min(
          (secondsLeft / (60 * 60)) * 100,
          100
        )
      : totalSeconds > 0
        ? Math.min(
            100,
            Math.max(
              0,
              ((totalSeconds - secondsLeft) / totalSeconds) * 100
            )
          )
        : 0;
  const circumference = 2 * Math.PI * 185;
  const strokeDashoffset =
    circumference -
    (progress / 100) *
      circumference;
  const todayFocusSeconds = Number(todayStats.focus_seconds) || 0;
  const todayBreakSeconds = Number(todayStats.break_seconds) || 0;
  const todayFocusSessions = Number(todayStats.focus_sessions) || 0;
  const todayTargetSeconds = 6 * 60 * 60;
  const todayTargetPercentage =
    todayTargetSeconds > 0
      ? Math.min(
          100,
          Math.round(
            (todayFocusSeconds / todayTargetSeconds) * 100
          )
        )
      : 0;
  const statsCircleCircumference = 2 * Math.PI * 72;
  const statsCircleOffset =
    statsCircleCircumference -
    (todayTargetPercentage / 100) *
      statsCircleCircumference;
  const displayedCompletedSessions = Math.max(
    todayFocusSessions,
    completedSessions
  );
  const SubjectIcon = selectedSubjectData
    ? getIconComponent(selectedSubjectData.icon)
    : FaBookOpen;
  return (
    <main className="focus-session-page">
      <div className="focus-session-container">
        <Header />
        {}
        <section className="focus-session-main-grid">
          {}
          <div className="focus-session-timer-card">
            <div className="focus-session-timer-top">
              <div className="focus-session-session-badge">
                <FaBrain />
                {sessionType === "focus" ? "جلسة عميقة" : "وقت الراحة"}
              </div>
            </div>
            {}
            <div className="focus-session-timer-wrapper">
              <svg
                className="focus-session-timer-svg"
                viewBox="0 0 420 420"
              >
                <circle
                  className="focus-session-timer-track"
                  cx="210"
                  cy="210"
                  r="185"
                />
                <circle
                  className="focus-session-timer-progress"
                  cx="210"
                  cy="210"
                  r="185"
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeDashoffset,
                  }}
                />
              </svg>
              <div className="focus-session-timer-content">
                <h1>{selectedMode === "open" ? "مؤقت مفتوح" : sessionType === "focus" ? goalText.title : "راحة"}</h1>
                <p className="focus-session-timer-subtitle">{selectedMode === "open" ? "احسب وقت تركيزك بدون حد زمني" : sessionType === "focus" ? goalText.subtitle : "استرح قليلاً واستعد للجلسة القادمة"}</p>
                <div className="focus-session-timer-time">{formattedTime}</div>
                <span className="focus-session-timer-label">{selectedMode === "open" ? "وقت التركيز" : sessionType === "focus" ? "وقت التركيز" : "وقت الراحة"}</span>
                <div className="focus-session-number">
                  <FaCheckCircle />
                  جلسة {displayedCompletedSessions} من 4 اليوم
                </div>
              </div>
            </div>
            {}
            <div className="focus-session-timer-controls">
              <button
                className="focus-session-timer-side-btn cancel"
                onClick={cancelSession}
                disabled={sessionSaving || !currentSessionId}
              >
                <FaTimes />
                إلغاء الجلسة
              </button>
              <button
                className={`focus-session-main-timer-btn ${isRunning ? "pause" : ""} ${!isSessionGoalValid && !currentSessionId ? "disabled-goal" : ""}`}
                onClick={toggleTimer}
                disabled={sessionSaving || sessionFinished}
                aria-label={isRunning ? "إيقاف مؤقت" : "بدء الجلسة"}
              >
                {isRunning ? <FaPause /> : <FaPlay />}
              </button>
              <button
                className="focus-session-timer-side-btn finish"
                onClick={finishSession}
                disabled={sessionSaving || !currentSessionId}
              >
                <FaCheck />
                إنهاء الجلسة
              </button>
            </div>
            <div className="focus-session-timer-secondary-controls">
              <button
                className="focus-session-timer-reset-btn"
                onClick={resetTimer}
                disabled={sessionSaving}
              >
                <FaRedo />
                إعادة ضبط
              </button>
            </div>
            <div className={`focus-session-timer-start-label ${isRunning ? "running" : ""}`}>
              {isRunning ? "الجلسة تعمل الآن" : sessionFinished ? "الجلسة انتهت — قيّم جلستك" : selectedMode === "open" ? secondsLeft > 0 ? "الجلسة متوقفة مؤقتًا" : "اختر هدف الجلسة ثم ابدأ" : secondsLeft === 0 ? "انتهت الجلسة" : "اختر هدف الجلسة ثم ابدأ"}
            </div>
            {}
            {sessionFinished && (
              <div className="focus-session-finished-message">
                <FaCheckCircle />
                <div>
                  <strong>أحسنت! انتهت الجلسة 🎉</strong>
                  <span>قيّم الجلسة وسجل ملاحظاتك قبل البدء من جديد.</span>
                </div>
              </div>
            )}
          </div>
          {}
          <aside className="focus-session-settings">
            <div className="focus-session-settings-header">
              <h2>إعدادات الجلسة</h2>
              <FaCog />
            </div>
            {}
            <div className="focus-session-settings-section">
              <h3>نوع الجلسة</h3>
              <div className="focus-session-session-type-options">
                <button
                  className={sessionType === "focus" ? "selected" : ""}
                  onClick={() => changeSessionType("focus")}
                  disabled={Boolean(currentSessionId)}
                >
                  <FaBrain />
                  <span>تركيز عميق</span>
                </button>
                <button
                  className={sessionType === "break" ? "selected" : ""}
                  onClick={() => changeSessionType("break")}
                  disabled={Boolean(currentSessionId)}
                >
                  <FaBookOpen />
                  <span>راحة</span>
                </button>
              </div>
            </div>
            {}
            <div className="focus-session-settings-section">
              <h3>نمط الوقت</h3>
              <div className="focus-session-time-mode-options">
                <button
                  className={selectedMode === "25/5" ? "selected" : ""}
                  onClick={() => setSelectedMode("25/5")}
                  disabled={Boolean(currentSessionId)}
                >
                  <strong>25/5</strong>
                  <span>25 دقيقة تركيز</span>
                  <small>5 دقائق راحة</small>
                </button>
                <button
                  className={selectedMode === "50/10" ? "selected" : ""}
                  onClick={() => setSelectedMode("50/10")}
                  disabled={Boolean(currentSessionId)}
                >
                  <strong>50/10</strong>
                  <span>50 دقيقة تركيز</span>
                  <small>10 دقائق راحة</small>
                </button>
              </div>
              <button
                className={`focus-session-custom-time-btn ${selectedMode === "open" ? "selected" : ""}`}
                onClick={() => setSelectedMode("open")}
                disabled={Boolean(currentSessionId)}
              >
                <FaStopwatch />
                <span>
                  <strong>مفتوح</strong>
                  <small>ابدأ واحسب وقتك بدون حد</small>
                </span>
                <FaChevronRight />
              </button>
            </div>
            {}
            <div className="focus-session-settings-section">
              <div className="focus-session-goal-section-heading">
                <h3>هدف الجلسة</h3>
                <button
                  className="focus-session-goal-edit-btn"
                  onClick={() => setGoalOpen(true)}
                  disabled={Boolean(currentSessionId)}
                >
                  <FaSearch />
                  تغيير
                </button>
              </div>
              <button
                className="focus-session-session-goal clickable"
                onClick={() => setGoalOpen(true)}
                disabled={Boolean(currentSessionId)}
              >
                <div className="focus-session-goal-icon">
                  {selectedGoalType === "questions" ? (
                    <FaQuestionCircle />
                  ) : selectedGoalType === "review" ? (
                    <FaRedo />
                  ) : (
                    <SubjectIcon />
                  )}
                </div>
                <div className="focus-session-goal-info">
                  <strong>{goalText.title}</strong>
                  <span>{goalText.subtitle}</span>
                </div>
                <FaChevronRight className="focus-session-goal-arrow" />
              </button>
            </div>
            {}
            <div className="focus-session-settings-section">
              <h3>مستوى التركيز المتوقع</h3>
              <div className="focus-session-focus-levels">
                <button
                  className={`focus-session-focus-level low ${focusLevel === "low" ? "selected" : ""}`}
                  onClick={() => setFocusLevel("low")}
                  disabled={Boolean(currentSessionId)}
                >
                  <FaFrown />
                  <span>منخفض</span>
                </button>
                <button
                  className={`focus-session-focus-level medium ${focusLevel === "medium" ? "selected" : ""}`}
                  onClick={() => setFocusLevel("medium")}
                  disabled={Boolean(currentSessionId)}
                >
                  <FaMeh />
                  <span>متوسط</span>
                </button>
                <button
                  className={`focus-session-focus-level high ${focusLevel === "high" ? "selected" : ""}`}
                  onClick={() => setFocusLevel("high")}
                  disabled={Boolean(currentSessionId)}
                >
                  <FaSmile />
                  <span>عالي</span>
                </button>
              </div>
            </div>
          </aside>
        </section>
        {}
        {goalOpen && (
          <div
            className="focus-session-goal-overlay"
            onClick={(e) => {
              if (e.target.classList.contains("focus-session-goal-overlay")) {
                setGoalOpen(false);
              }
            }}
          >
            <div className="focus-session-goal-modal">
              {}
              <div className="focus-session-goal-modal-header">
                <div>
                  <h2>هدف الجلسة</h2>
                  <p>اختر المادة وما تريد إنجازه في هذه الجلسة</p>
                </div>
                <button
                  onClick={() => setGoalOpen(false)}
                  className="focus-session-goal-close-btn"
                >
                  <FaTimes />
                </button>
              </div>
              {}
              <div className="focus-session-goal-step">
                <div className="focus-session-goal-step-title">
                  <span>1</span>
                  <div>
                    <strong>اختر المادة</strong>
                    <small>حدد المادة التي تريد مذاكرتها</small>
                  </div>
                </div>
                {loadingSubjects ? (
                  <div>جاري تحميل المواد...</div>
                ) : subjectsError ? (
                  <div>{subjectsError}</div>
                ) : subjects.length === 0 ? (
                  <div>لا توجد مواد متاحة حالياً</div>
                ) : (
                  <div className="focus-session-subjects-grid">
                    {subjects.map((subject) => {
                      const IconComponent = getIconComponent(subject.icon);
                      return (
                        <button
                          key={subject.id}
                          className={`focus-session-subject-option ${String(selectedSubject) === String(subject.id) ? "selected" : ""}`}
                          onClick={() => handleSubjectSelect(subject.id)}
                        >
                          <span className="focus-session-subject-emoji">
                            <IconComponent />
                          </span>
                          <strong>{subject.name}</strong>
                          <small>{subject.description}</small>
                          {String(selectedSubject) === String(subject.id) && (
                            <FaCheckCircle className="focus-session-subject-check" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {}
              {selectedSubjectData && (
                <div className="focus-session-goal-step">
                  <div className="focus-session-goal-step-title">
                    <span>2</span>
                    <div>
                      <strong>ماذا تريد أن تفعل؟</strong>
                      <small>اختر نوع المهمة التي ستنفذها</small>
                    </div>
                  </div>
                  <div className="focus-session-goal-types-grid">
                    {goalTypes.map((goal) => (
                      <button
                        key={goal.id}
                        className={`focus-session-goal-type-option ${selectedGoalType === goal.id ? "selected" : ""}`}
                        onClick={() => handleGoalTypeSelect(goal.id)}
                      >
                        <div className="focus-session-goal-type-icon">{goal.icon}</div>
                        <div>
                          <strong>{goal.title}</strong>
                          <small>{goal.description}</small>
                        </div>
                        {selectedGoalType === goal.id && (
                          <FaCheckCircle className="focus-session-goal-type-check" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {}
              {selectedSubjectData && selectedGoalType && (
                <div className="focus-session-goal-step">
                  <div className="focus-session-goal-step-title">
                    <span>3</span>
                    <div>
                      <strong>{selectedGoalType === "questions" ? "اختر نطاق الأسئلة" : "اختر الدرس"}</strong>
                      <small>الدروس مرتبة حسب الأولوية</small>
                    </div>
                  </div>
                  {selectedGoalType === "questions" ? (
                    <>
                      <div className="focus-session-question-targets">
                        <button
                          className={`focus-session-question-target ${selectedLesson ? "selected" : ""}`}
                          onClick={() => {
                            setSelectedUnit("");
                          }}
                        >
                          <FaBook />
                          <div>
                            <strong>درس محدد</strong>
                            <small>اختر درس لحل أسئلته</small>
                          </div>
                        </button>
                        <button
                          className={`focus-session-question-target ${selectedUnit ? "selected" : ""}`}
                          onClick={() => {
                            setSelectedLesson("");
                            setSelectedUnit(selectedSubjectData.units?.[0]?.id || "");
                          }}
                        >
                          <FaLayerGroup />
                          <div>
                            <strong>وحدة كاملة</strong>
                            <small>حل أسئلة الوحدة</small>
                          </div>
                        </button>
                        <button
                          className={`focus-session-question-target ${!selectedLesson && !selectedUnit ? "selected" : ""}`}
                          onClick={() => {
                            setSelectedLesson("");
                            setSelectedUnit("");
                          }}
                        >
                          <FaQuestionCircle />
                          <div>
                            <strong>أسئلة شاملة</strong>
                            <small>أسئلة من أكثر من درس</small>
                          </div>
                        </button>
                      </div>
                      <div className="focus-session-goal-select-label">اختر الدرس</div>
                      <div className="focus-session-lessons-list">
                        {selectedSubjectData.lessons?.map((lesson, index) => (
                          <button
                            key={lesson.id}
                            className={`focus-session-lesson-option ${String(selectedLesson) === String(lesson.id) ? "selected" : ""}`}
                            onClick={() => handleLessonSelect(lesson.id)}
                          >
                            <div className="focus-session-lesson-priority">{index + 1}</div>
                            <div className="focus-session-lesson-info">
                              <strong>{lesson.title}</strong>
                              <span>{getPriorityText(index)}</span>
                            </div>
                            <FaChevronRight />
                          </button>
                        ))}
                      </div>
                      <div className="focus-session-goal-select-label focus-session-unit-label">أو اختر وحدة</div>
                      <div className="focus-session-units-list">
                        {selectedSubjectData.allUnits
                          ?.filter((unit) => (unit.lessons || []).length > 0)
                          .map((unit) => (
                            <button
                              key={unit.id}
                              className={`focus-session-unit-option ${
                                String(selectedUnit) === String(unit.id)
                                  ? "selected"
                                  : ""
                              }`}
                              onClick={() => handleUnitSelect(unit.id)}
                            >
                              <FaLayerGroup />

                              <span>
                                {unit.parent_unit_id ? "↳ " : ""}
                                {unit.title}
                              </span>
                            </button>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="focus-session-lessons-list">
                      {selectedSubjectData.lessons?.map((lesson, index) => (
                        <button
                          key={lesson.id}
                          className={`focus-session-lesson-option ${String(selectedLesson) === String(lesson.id) ? "selected" : ""}`}
                          onClick={() => handleLessonSelect(lesson.id)}
                        >
                          <div className="focus-session-lesson-priority">{index + 1}</div>
                          <div className="focus-session-lesson-info">
                            <strong>{lesson.title}</strong>
                            <span>{getPriorityText(index)}</span>
                          </div>
                          <FaChevronRight />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {}
              {selectedSubjectData &&
                selectedGoalType &&
                (selectedLesson ||
                  selectedUnit ||
                  selectedGoalType === "questions") && (
                  <div className="focus-session-goal-preview">
                    <div className="focus-session-goal-preview-icon">
                      <FaBrain />
                    </div>
                    <div>
                      <span>هدف الجلسة</span>
                      <strong>{goalText.title}</strong>
                    </div>
                  </div>
                )}
              {}
              <div className="focus-session-goal-modal-footer">
                <button
                  className="focus-session-goal-cancel-btn"
                  onClick={() => setGoalOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  className="focus-session-goal-confirm-btn"
                  disabled={!validateGoal().valid}
                  onClick={confirmGoal}
                >
                  <FaCheck />
                  تأكيد هدف الجلسة
                </button>
              </div>
            </div>
          </div>
        )}
        {}
        <section className="focus-session-bottom-grid">
          {}
          <div className="focus-session-box focus-session-today-stats">
            <div className="focus-session-box-heading">
              <h2>إحصائيات اليوم</h2>
              <FaChartBar />
            </div>
            <div className="focus-session-stats-circle">
              <svg viewBox="0 0 180 180">
                <circle
                  cx="90"
                  cy="90"
                  r="72"
                  className="focus-session-stats-circle-track"
                />
                <circle
                  cx="90"
                  cy="90"
                  r="72"
                  className="focus-session-stats-circle-progress"
                  style={{
                    strokeDasharray: statsCircleCircumference,
                    strokeDashoffset: statsCircleOffset,
                  }}
                />
              </svg>
              <div className="focus-session-stats-circle-content">
                <strong>{formatDuration(todayFocusSeconds)}</strong>
                <span>إجمالي التركيز</span>
              </div>
            </div>
            <div className="focus-session-stats-target">
              <span>من 6 ساعات مستهدفة</span>
              <div className="focus-session-target-progress">
                <div
                  style={{
                    width: `${todayTargetPercentage}%`,
                  }}
                />
              </div>
              <strong>{todayTargetPercentage}%</strong>
            </div>
            <div className="focus-session-mini-stats">
              <div>
                <strong>{formatDuration(todayBreakSeconds)}</strong>
                <span>الراحة</span>
              </div>
              <div>
                <strong>{formatDuration(todayFocusSeconds)}</strong>
                <span>التركيز</span>
              </div>
              <div>
                <strong>{todayFocusSessions}</strong>
                <span>الجلسات</span>
              </div>
            </div>
            <button
              className="focus-session-outline-btn"
              onClick={() => navigate("/FocusStatistics")}
            >
              عرض جميع الإحصائيات
            </button>
          </div>
          {}
          <div className={`focus-session-box focus-session-feedback-box ${sessionFinished ? "feedback-active" : ""}`}>
            <div className="focus-session-box-heading">
              <h2>بعد انتهاء الجلسة</h2>
              <span className="celebration">🎉</span>
            </div>
            <div className="focus-session-feedback-content">
              <h3>هل أنجزت هدف الجلسة؟</h3>
              <p>قيّم مدى تحقيقك لهدفك</p>
              <div className="focus-session-feedback-options">
                <button
                  className={`focus-session-feedback-option yes ${feedback === "yes" ? "active" : ""}`}
                  onClick={() => setFeedback("yes")}
                  disabled={!sessionFinished || sessionSaving}
                >
                  <FaSmile />
                  <span>نعم</span>
                </button>
                <button
                  className={`focus-session-feedback-option partial ${feedback === "partial" ? "active" : ""}`}
                  onClick={() => setFeedback("partial")}
                  disabled={!sessionFinished || sessionSaving}
                >
                  <FaMeh />
                  <span>جزئياً</span>
                </button>
                <button
                  className={`focus-session-feedback-option no ${feedback === "no" ? "active" : ""}`}
                  onClick={() => setFeedback("no")}
                  disabled={!sessionFinished || sessionSaving}
                >
                  <FaFrown />
                  <span>لا</span>
                </button>
              </div>
              <textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                disabled={!sessionFinished || sessionSaving}
                placeholder="اكتب ملاحظاتك عن الجلسة..."
              />
              <button
                className="focus-session-save-feedback"
                onClick={saveFeedback}
                disabled={!sessionFinished || !feedback || sessionSaving}
              >
                {sessionSaving ? "جاري الحفظ..." : "حفظ الجلسة"}
              </button>
            </div>
          </div>
          {}
          <div className="focus-session-box focus-session-previous-box">
            <div className="focus-session-box-heading">
              <h2>الجلسات السابقة اليوم</h2>
              <FaClock />
            </div>
            <div className="focus-session-previous-list">
              {loadingStats ? (
                <div>جاري تحديث الجلسات...</div>
              ) : previousSessions.length === 0 ? (
                <div>لا توجد جلسات سابقة اليوم</div>
              ) : (
                previousSessions.map((item) => (
                  <div
                    className="focus-session-previous-session"
                    key={item.id}
                  >
                    <div className={`focus-session-previous-status ${item.status}`}>
                      {item.status === "completed" ? <FaCheckCircle /> : <span />}
                    </div>
                    <div className="focus-session-previous-info">
                      <strong>{item.subject_name || "جلسة تركيز"}</strong>
                      <span>{item.lesson_title || item.unit_title || "جلسة بدون درس"}</span>
                    </div>
                    <div className="focus-session-previous-time">
                      <strong>{formatDuration(item.actual_seconds)}</strong>
                      <span>{formatTimeOfDay(item.started_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              className="focus-session-text-btn"
              onClick={() => navigate("/FocusStatistics")}
            >
              عرض كل الجلسات
            </button>
          </div>
          {}
          <div className="focus-session-box focus-session-distribution-box">
            <div className="focus-session-box-heading">
              <h2>توزيع وقت التركيز على المواد</h2>
              <FaChartPie />
            </div>
            <div className="focus-session-distribution-content">
              <div className="focus-session-distribution-chart">
                <svg viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="65"
                    className="focus-session-distribution-bg"
                  />
                  {(() => {
                    let offset = 0;
                    const chartCircumference = 2 * Math.PI * 65;
                    return distribution.map((item, index) => {
                      const percentage = Math.max(
                        0,
                        Math.min(
                          100,
                          parseFloat(item.percentage) || 0
                        )
                      );
                      const dash =
                        (percentage / 100) *
                        chartCircumference;
                      const currentOffset = -offset;
                      offset += dash;
                      return (
                        <circle
                          key={`${item.subject}-${index}`}
                          cx="100"
                          cy="100"
                          r="65"
                          className={`focus-session-distribution-segment ${["blue", "green", "purple", "orange"][index] || "blue"}`}
                          strokeDasharray={`${dash} ${chartCircumference}`}
                          strokeDashoffset={currentOffset}
                        />
                      );
                    });
                  })()}
                </svg>
                <div>
                  <strong>{formatDuration(todayFocusSeconds)}</strong>
                  <span>إجمالي التركيز</span>
                </div>
              </div>
              <div className="focus-session-distribution-list">
                {distribution.length === 0 ? (
                  <div>لا توجد بيانات تركيز اليوم</div>
                ) : (
                  distribution.map((item, index) => (
                    <div
                      className="focus-session-distribution-row"
                      key={`${item.subject}-${index}`}
                    >
                      <span className={`focus-session-distribution-dot ${item.className}`} />
                      <strong>{item.subject}</strong>
                      <span>{item.time}</span>
                      <small>({item.percentage})</small>
                    </div>
                  ))
                )}
              </div>
            </div>
            <button
              className="focus-session-text-btn"
              onClick={() => navigate("/FocusStatistics")}
            >
              تحليل تفصيلي
            </button>
          </div>
        </section>
        {}
        <section className="focus-session-tip">
          <div className="focus-session-tip-image">
            <FaLeaf />
          </div>
          <div className="focus-session-tip-text">
            <h2>نصيحة اليوم</h2>
            <p>التركيز مش ساعات طويلة، التركيز هو جودة وقتك. خذ بريك كل شوية، اشرب مياه، وابعد عن المشتتات.</p>
          </div>
          <div className="focus-session-tip-light">
            <FaLightbulb />
          </div>
        </section>
      </div>
    </main>
  );
};
export default FocusSession;