import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaChevronRight,
  FaChevronLeft,
  FaPen,
  FaCheckCircle,
  FaBookOpen,
  FaClock,
  FaTasks,
  FaChartPie,
  FaCoffee,
  FaFlask,
  FaUtensils,
  FaBrain,
  FaLightbulb,
  FaMagic,
  FaPlus,
  FaTrash,
  FaTimes,
  FaSave,
  FaAtom,
  FaCheck,
  FaSpinner,
} from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import "./Plan.css";
import Header from "../../components/Header/Header";
import { supabase } from "../../utils/supabaseClient";

/* =====================================================
   HELPERS
===================================================== */
const formatDateArabic = (date) => {
  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};
const formatDateForDB = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const formatMinutes = (minutes) => {
  const value = Number(minutes) || 0;
  if (value <= 0) return "0 د";
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  if (hours > 0 && mins > 0) return `${hours} س ${mins} د`;
  if (hours > 0) return `${hours} س`;
  return `${mins} د`;
};
const getMinutesFromTime = (time) => {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  let start = getMinutesFromTime(startTime);
  let end = getMinutesFromTime(endTime);
  if (end < start) end += 24 * 60;
  return end - start;
};

/* =====================================================
   SESSION TYPE FROM SUBJECT
===================================================== */

const getSessionIcon = (type) => {
  switch (type) {
    case "break":
      return <FaCoffee />;
    case "meal":
      return <FaUtensils />;
    case "review":
      return <FaBrain />;
    case "questions":
      return <FaPen />;
    case "chemistry":
      return <FaFlask />;
    case "biology":
      return <FaBrain />;
    case "arabic":
      return <FaBookOpen />;
    case "physics":
      return <FaAtom />;
    default:
      return <FaBookOpen />;
  }
};

const getSessionTypeFromSubject = (subject) => {
  const name = subject?.name || "";

  if (name.includes("فيزياء")) return "physics";
  if (name.includes("كيمياء")) return "chemistry";
  if (name.includes("أحياء")) return "biology";
  if (name.includes("عربي")) return "arabic";

  return "study";
};

/* =====================================================
   EMPTY FORMS
===================================================== */
/*
 * مهم:
 * study_plan_sessions لا تحتوي على:
 * subject_id
 * unit_id
 * lesson_id
 */
const EMPTY_SESSION = {
  startTime: "09:00",
  endTime: "10:00",
  title: "",
  subtitle: "",
  type: "study",
  priority: "",
};
const EMPTY_TASK = {
  title: "",
  checked: false,
  subjectId: "",
  unitId: "",
  lessonId: "",
  priority: "",
  durationMinutes: "",
  dueTime: "",
};
const EMPTY_NOTE = {
  text: "",
};

/* =====================================================
   COMPONENT
===================================================== */
const Plan = () => {
  /* =====================================================
     USER
  ===================================================== */
  const [user, setUser] = useState(null);

  /* =====================================================
     DATE
  ===================================================== */
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDateDB = useMemo(() => formatDateForDB(selectedDate), [selectedDate]);

  /* =====================================================
     PLAN
  ===================================================== */
  const [plan, setPlan] = useState(null);
  const [planName, setPlanName] = useState("خطتي الدراسية");
  const [planGoal, setPlanGoal] = useState("الاستعداد للامتحانات وتحسين مستواي");

  /* =====================================================
     SUBJECTS
  ===================================================== */
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");

  /* =====================================================
     DAY DATA
  ===================================================== */
  const [sessions, setSessions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);

  /* =====================================================
     LOADING
  ===================================================== */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* =====================================================
     MODALS
  ===================================================== */
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSmartPlanModal, setShowSmartPlanModal] = useState(false);

  /* =====================================================
     EDITING
  ===================================================== */
  const [editingSession, setEditingSession] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingNote, setEditingNote] = useState(null);

  /* =====================================================
     FORMS
  ===================================================== */
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [noteForm, setNoteForm] = useState(EMPTY_NOTE);

  /* =====================================================
     SMART PLAN
  ===================================================== */
  const [smartPlanLoading, setSmartPlanLoading] = useState(false);

  /* =====================================================
     AUTH
  ===================================================== */
  const getCurrentUser = useCallback(async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      throw sessionError;
    }
    const sessionUser = sessionData?.session?.user;
    if (sessionUser?.id) {
      setUser(sessionUser);
      console.log("PLAN SESSION:", sessionData.session);
      console.log("PLAN USER:", sessionUser);
      console.log("PLAN USER ID:", sessionUser.id);
      return sessionUser;
    }
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw userError;
    }
    if (!userData?.user?.id) {
      throw new Error("لا توجد جلسة تسجيل دخول. سجل الدخول مرة أخرى.");
    }
    setUser(userData.user);
    return userData.user;
  }, []);

  /* =====================================================
     LOAD SUBJECTS
  ===================================================== */
  const fetchSubjects = useCallback(async () => {
    try {
      setLoadingSubjects(true);
      setSubjectsError("");

      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!currentUser) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }

      // =========================
      // Student Profile
      // =========================
      const { data: profileData, error: profileError } = await supabase
        .from("student_profiles")
        .select(`
          id,
          user_id,
          section
        `)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        throw new Error("لم يتم العثور على بيانات الطالب");
      }

      const studentSection = profileData.section?.trim();

      if (!studentSection) {
        throw new Error("لم يتم تحديد شعبة الطالب");
      }

      // =========================
      // Section
      // =========================
      const { data: sectionData, error: sectionError } = await supabase
        .from("sections")
        .select(`
          id,
          name
        `)
        .eq("name", studentSection)
        .maybeSingle();

      if (sectionError) throw sectionError;

      if (!sectionData) {
        throw new Error(
          `لم يتم العثور على الشعبة "${studentSection}"`
        );
      }

      // =========================
      // Subjects by Section
      // =========================
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

        if (!subject || !subject.is_active) return;

        subjectsMap.set(subject.id, subject);
      });

      const subjectsData = Array.from(
        subjectsMap.values()
      ).sort((a, b) =>
        String(a.name || "").localeCompare(
          String(b.name || ""),
          "ar"
        )
      );

      if (!subjectsData.length) {
        setSubjects([]);
        return;
      }

      const subjectIds = subjectsData.map(
        (subject) => subject.id
      );

      // =========================
      // New Curriculum Units
      // =========================
      const { data: unitsData, error: unitsError } = await supabase
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

      if (unitsError) throw unitsError;

      const allUnits = unitsData || [];

      const unitIds = allUnits.map(
        (unit) => unit.id
      );

      // =========================
      // New Curriculum Lessons
      // =========================
      let lessonsData = [];

      if (unitIds.length) {
        const { data, error } = await supabase
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

        if (error) throw error;

        lessonsData = data || [];
      }

      // =========================
      // Build Subjects
      // =========================
      const formattedSubjects = subjectsData.map((subject) => {
        const subjectUnits = allUnits.filter(
          (unit) =>
            String(unit.subject_id) === String(subject.id)
        );

        const subjectLessons = lessonsData
          .filter((lesson) =>
            subjectUnits.some(
              (unit) =>
                String(unit.id) === String(lesson.unit_id)
            )
          )
          .map((lesson) => {
            const unit = subjectUnits.find(
              (item) =>
                String(item.id) === String(lesson.unit_id)
            );

            return {
              ...lesson,
              unitId: unit?.id || lesson.unit_id,
              unitTitle: unit?.title || "",
            };
          });

        return {
          ...subject,

          description:
            subject.subtitle ||
            "اختر المادة وابدأ الدراسة",

          // كل الوحدات
          units: subjectUnits,

          // كل الدروس
          lessons: subjectLessons,

          // مهم لو احتجنا الوحدات الفرعية لاحقًا
          allUnits: subjectUnits,
        };
      });

      setSubjects(formattedSubjects);

    } catch (err) {
      console.error("fetchSubjects error:", err);

      setSubjectsError(
        err?.message ||
          "حدث خطأ أثناء تحميل المواد والدروس."
      );

      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  /* =====================================================
     FIND SUBJECT
  ===================================================== */
  const findSubject = useCallback((subjectId) => {
    if (!subjectId) return null;
    return subjects.find((item) => String(item.id) === String(subjectId));
  }, [subjects]);

  /* =====================================================
     FORMAT SESSION
  ===================================================== */
  const formatSession = useCallback((session) => {
    return {
      ...session,
      startTime: session.start_time?.slice(0, 5) || "",
      endTime: session.end_time?.slice(0, 5) || "",
    };
  }, []);

  /* =====================================================
     FORMAT TASK
  ===================================================== */
  const formatTask = useCallback((task) => {
    const subject = findSubject(task.subject_id);

    const unit = subject?.units?.find(
      (item) =>
        String(item.id) === String(task.unit_id)
    );

    const lesson = subject?.lessons?.find(
      (item) =>
        String(item.id) === String(task.lesson_id)
    );

    return {
      ...task,
      checked: Boolean(task.is_completed),
      subjectName: subject?.name || "",
      unitTitle: unit?.title || "",
      lessonTitle: lesson?.title || "",
    };
  }, [findSubject]);

  /* =====================================================
     FORMAT NOTE
  ===================================================== */
  const formatNote = useCallback((note) => {
    const subject = findSubject(note.subject_id);

    const unit = subject?.units?.find(
      (item) =>
        String(item.id) === String(note.unit_id)
    );

    const lesson = subject?.lessons?.find(
      (item) =>
        String(item.id) === String(note.lesson_id)
    );

    return {
      ...note,
      text: note.content || "",
      subjectName: subject?.name || "",
      unitTitle: unit?.title || "",
      lessonTitle: lesson?.title || "",
    };
  }, [findSubject]);

  /* =====================================================
     LOAD PLAN
  ===================================================== */
  const loadPlan = useCallback(async (currentUser) => {
    const { data, error: planError } = await supabase
      .from("study_plans")
      .select(`
          id,
          user_id,
          plan_date,
          name,
          goal,
          created_at,
          updated_at
        `)
      .eq("user_id", currentUser.id)
      .eq("plan_date", selectedDateDB)
      .maybeSingle();
    if (planError) {
      throw planError;
    }
    if (data) {
      setPlan(data);
      setPlanName(data.name || "خطتي الدراسية");
      setPlanGoal(data.goal || "الاستعداد للامتحانات وتحسين مستواي");
      return data;
    }
    const { data: createdPlan, error: createError } = await supabase
      .from("study_plans")
      .insert({
        user_id: currentUser.id,
        plan_date: selectedDateDB,
        name: "خطتي الدراسية",
        goal: "الاستعداد للامتحانات وتحسين مستواي",
      })
      .select()
      .single();
    if (createError) {
      throw createError;
    }
    setPlan(createdPlan);
    setPlanName(createdPlan.name || "خطتي الدراسية");
    setPlanGoal(createdPlan.goal || "الاستعداد للامتحانات وتحسين مستواي");
    return createdPlan;
  }, [selectedDateDB]);

  /* =====================================================
     LOAD DAY DATA
  ===================================================== */
  const loadDayData = useCallback(async (currentUser) => {
    setLoading(true);
    setError("");
    try {
      const currentPlan = await loadPlan(currentUser);
      /* =========================
         SESSIONS
      ========================= */
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("study_plan_sessions")
        .select(`
            id,
            user_id,
            plan_id,
            session_date,
            start_time,
            end_time,
            title,
            subtitle,
            type,
            priority,
            created_at,
            updated_at
          `)
        .eq("user_id", currentUser.id)
        .eq("plan_id", currentPlan.id)
        .eq("session_date", selectedDateDB)
        .order("start_time", { ascending: true });
      if (sessionsError) {
        throw sessionsError;
      }
      const formattedSessions = (sessionsData || []).map(formatSession);
      setSessions(formattedSessions);
      /* =========================
         TASKS
      ========================= */
      const { data: tasksData, error: tasksError } = await supabase
        .from("study_tasks")
        .select(`
            id,
            user_id,
            plan_id,
            plan_date,
            title,
            is_completed,
            completed_at,
            subject_id,
            unit_id,
            lesson_id,
            priority,
            duration_minutes,
            due_date,
            due_time,
            created_at,
            updated_at
          `)
        .eq("user_id", currentUser.id)
        .eq("plan_id", currentPlan.id)
        .eq("plan_date", selectedDateDB)
        .order("created_at", { ascending: true });
      if (tasksError) {
        throw tasksError;
      }
      const formattedTasks = (tasksData || []).map(formatTask);
      setTasks(formattedTasks);
      /* =========================
         NOTES
      ========================= */
      /*
       * study_notes لا تحتوي على note_date.
       *
       * لذلك نستخدم created_at
       * ونحدد بداية ونهاية اليوم
       * بالتوقيت المحلي.
       */
      const localStart = new Date(`${selectedDateDB}T00:00:00`);
      const localEnd = new Date(localStart);
      localEnd.setDate(localEnd.getDate() + 1);
      const { data: notesData, error: notesError } = await supabase
        .from("study_notes")
        .select(`
            id,
            user_id,
            subject_id,
            unit_id,
            lesson_id,
            title,
            content,
            folder,
            status,
            is_pinned,
            created_at,
            updated_at
          `)
        .eq("user_id", currentUser.id)
        .gte("created_at", localStart.toISOString())
        .lt("created_at", localEnd.toISOString())
        .order("created_at", { ascending: false });
      if (notesError) {
        throw notesError;
      }
      const formattedNotes = (notesData || []).map(formatNote);
      setNotes(formattedNotes);
      console.log("PLAN:", currentPlan);
      console.log("SESSIONS:", formattedSessions);
      console.log("TASKS:", formattedTasks);
      console.log("NOTES:", formattedNotes);
    } catch (err) {
      console.error("loadDayData error:", err);
      setError(err?.message || "حدث خطأ أثناء تحميل الخطة.");
    } finally {
      setLoading(false);
    }
  }, [selectedDateDB, loadPlan, formatSession, formatTask, formatNote]);

  /* =====================================================
     INITIAL LOAD
  ===================================================== */
  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      try {
        setLoading(true);
        setError("");
        const currentUser = await getCurrentUser();
        if (!mounted) return;
        setUser(currentUser);
        await fetchSubjects();
        if (!mounted) return;
      } catch (err) {
        console.error("PLAN INITIALIZE ERROR:", err);
        if (mounted) {
          setError(err?.message || "تعذر تحميل الصفحة.");
          setLoading(false);
        }
      }
    };
    initialize();
    return () => {
      mounted = false;
    };
  }, [getCurrentUser, fetchSubjects]);

  /* =====================================================
     LOAD DAY AFTER USER + SUBJECTS
  ===================================================== */
  useEffect(() => {
    if (!user || subjects.length === 0) {
      return;
    }
    loadDayData(user);
  }, [user, subjects, selectedDateDB, loadDayData]);

  /* =====================================================
     SUBJECT OPTIONS
  ===================================================== */
  const selectedTaskSubject = useMemo(() => {
    return findSubject(taskForm.subjectId);
  }, [findSubject, taskForm.subjectId]);
  const taskUnits = selectedTaskSubject?.units || [];
  const taskLessons = selectedTaskSubject?.lessons?.filter((lesson) => !taskForm.unitId || String(lesson.unitId) === String(taskForm.unitId)) || [];

  /* =====================================================
     STATISTICS
  ===================================================== */
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.checked).length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalPlanMinutes = sessions.reduce((total, session) => total + calculateDuration(session.startTime, session.endTime), 0);
  const studyMinutes = sessions.filter((session) => !["break", "meal"].includes(session.type)).reduce((total, session) => total + calculateDuration(session.startTime, session.endTime), 0);
  const breakMinutes = sessions.filter((session) => session.type === "break").reduce((total, session) => total + calculateDuration(session.startTime, session.endTime), 0);
  const mealMinutes = sessions.filter((session) => session.type === "meal").reduce((total, session) => total + calculateDuration(session.startTime, session.endTime), 0);
  const reviewMinutes = sessions.filter((session) => session.type === "review").reduce((total, session) => total + calculateDuration(session.startTime, session.endTime), 0);
  const progressDegrees = (completionPercentage / 100) * 360;

  /* =====================================================
     DATE
  ===================================================== */
  const changeDate = (amount) => {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount);
      return next;
    });
  };
  const goToday = () => {
    setSelectedDate(new Date());
  };

  /* =====================================================
     SESSION CRUD
  ===================================================== */
  const openAddSession = () => {
    setEditingSession(null);
    setSessionForm({ ...EMPTY_SESSION });
    setShowSessionModal(true);
  };
  const openEditSession = (session) => {
    setEditingSession(session);
    setSessionForm({
      startTime: session.startTime || "09:00",
      endTime: session.endTime || "10:00",
      title: session.title || "",
      subtitle: session.subtitle || "",
      type: session.type || "study",
      priority: session.priority || "",
    });
    setShowSessionModal(true);
  };
  const saveSession = async (event) => {
    event.preventDefault();
    if (!user || !plan) {
      alert("لم يتم تحميل الخطة بعد.");
      return;
    }
    if (!sessionForm.title.trim()) {
      alert("من فضلك اكتب اسم الجلسة.");
      return;
    }
    if (!sessionForm.startTime || !sessionForm.endTime) {
      alert("من فضلك حدد وقت البداية والنهاية.");
      return;
    }
    if (calculateDuration(sessionForm.startTime, sessionForm.endTime) <= 0) {
      alert("وقت النهاية يجب أن يكون بعد وقت البداية.");
      return;
    }
    try {
      setSaving(true);
      const now = new Date().toISOString();
      /*
       * مهم جدًا:
       * لا يوجد subject_id
       * ولا unit_id
       * ولا lesson_id
       * في study_plan_sessions.
       */
      const payload = {
        user_id: user.id,
        plan_id: plan.id,
        session_date: selectedDateDB,
        start_time: sessionForm.startTime,
        end_time: sessionForm.endTime,
        title: sessionForm.title.trim(),
        subtitle: sessionForm.subtitle.trim() || null,
        type: sessionForm.type || "study",
        priority: sessionForm.priority || null,
        updated_at: now,
      };
      if (editingSession) {
        const { data, error: updateError } = await supabase
          .from("study_plan_sessions")
          .update(payload)
          .eq("id", editingSession.id)
          .eq("user_id", user.id)
          .eq("plan_id", plan.id)
          .select()
          .single();
        if (updateError) {
          throw updateError;
        }
        const formatted = formatSession(data);
        setSessions((current) => current.map((item) => item.id === data.id ? formatted : item).sort((a, b) => a.startTime.localeCompare(b.startTime)));
      } else {
        const { data, error: insertError } = await supabase
          .from("study_plan_sessions")
          .insert({
            ...payload,
            created_at: now,
          })
          .select()
          .single();
        if (insertError) {
          throw insertError;
        }
        const formatted = formatSession(data);
        setSessions((current) => [...current, formatted].sort((a, b) => a.startTime.localeCompare(b.startTime)));
      }
      setShowSessionModal(false);
      setEditingSession(null);
      setSessionForm({ ...EMPTY_SESSION });
    } catch (err) {
      console.error("saveSession error:", err);
      alert(err?.message || "تعذر حفظ الجلسة.");
    } finally {
      setSaving(false);
    }
  };
  const deleteSession = async (id) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذه الجلسة؟");
    if (!confirmed || !user) {
      return;
    }
    try {
      setSaving(true);
      const { error: deleteError } = await supabase
        .from("study_plan_sessions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (deleteError) {
        throw deleteError;
      }
      setSessions((current) => current.filter((session) => session.id !== id));
    } catch (err) {
      console.error("deleteSession error:", err);
      alert(err?.message || "تعذر حذف الجلسة.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     TASK CRUD
  ===================================================== */
  const openAddTask = () => {
    setEditingTask(null);
    setTaskForm({ ...EMPTY_TASK });
    setShowTaskModal(true);
  };
  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title || "",
      checked: Boolean(task.is_completed),
      subjectId: task.subject_id || "",
      unitId: task.unit_id || "",
      lessonId: task.lesson_id || "",
      priority: task.priority || "",
      durationMinutes: task.duration_minutes ? String(task.duration_minutes) : "",
      dueTime: task.due_time ? task.due_time.slice(0, 5) : "",
    });
    setShowTaskModal(true);
  };
  const saveTask = async (event) => {
    event.preventDefault();
    if (!user || !plan) {
      alert("لم يتم تحميل الخطة بعد.");
      return;
    }
    if (!taskForm.title.trim()) {
      alert("من فضلك اكتب اسم المهمة.");
      return;
    }
    const durationValue = taskForm.durationMinutes ? Number(taskForm.durationMinutes) : null;
    if (durationValue !== null && (!Number.isFinite(durationValue) || durationValue <= 0)) {
      alert("مدة المهمة يجب أن تكون رقمًا صحيحًا أكبر من صفر.");
      return;
    }
    try {
      setSaving(true);
      const isCompleted = Boolean(taskForm.checked);
      const now = new Date().toISOString();
      const payload = {
        user_id: user.id,
        plan_id: plan.id,
        plan_date: selectedDateDB,
        title: taskForm.title.trim(),
        is_completed: isCompleted,
        completed_at: isCompleted ? now : null,
        subject_id: taskForm.subjectId || null,
        unit_id: taskForm.unitId || null,
        lesson_id: taskForm.lessonId || null,
        priority: taskForm.priority || null,
        duration_minutes: durationValue,
        due_date: selectedDateDB,
        due_time: taskForm.dueTime || null,
        updated_at: now,
      };
      if (editingTask) {
        const { data, error: updateError } = await supabase
          .from("study_tasks")
          .update(payload)
          .eq("id", editingTask.id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (updateError) {
          throw updateError;
        }
        const formatted = formatTask(data);
        setTasks((current) => current.map((item) => item.id === data.id ? formatted : item));
      } else {
        const { data, error: insertError } = await supabase
          .from("study_tasks")
          .insert({
            ...payload,
            created_at: now,
          })
          .select()
          .single();
        if (insertError) {
          throw insertError;
        }
        const formatted = formatTask(data);
        setTasks((current) => [...current, formatted]);
      }
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskForm({ ...EMPTY_TASK });
    } catch (err) {
      console.error("saveTask error:", err);
      alert(err?.message || "تعذر حفظ المهمة.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     TOGGLE TASK
  ===================================================== */
  const toggleTask = async (taskId) => {
    if (!user) return;
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask) return;
    const nextCompleted = !currentTask.checked;
    try {
      const now = new Date().toISOString();
      const { data, error: updateError } = await supabase
        .from("study_tasks")
        .update({
          is_completed: nextCompleted,
          completed_at: nextCompleted ? now : null,
          updated_at: now,
        })
        .eq("id", taskId)
        .eq("user_id", user.id)
        .select()
        .single();
      if (updateError) {
        throw updateError;
      }
      /*
       * التحديث يتم فعليًا داخل Supabase.
       *
       * بالتالي الـ Achievement triggers
       * الموجودة على study_tasks
       * تستطيع العمل تلقائيًا.
       */
      setTasks((current) => current.map((task) => task.id === taskId ? {
        ...task,
        ...data,
        checked: Boolean(data.is_completed),
      } : task));
    } catch (err) {
      console.error("toggleTask error:", err);
      alert(err?.message || "تعذر تحديث المهمة.");
    }
  };

  /* =====================================================
     DELETE TASK
  ===================================================== */
  const deleteTask = async (id) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذه المهمة؟");
    if (!confirmed || !user) {
      return;
    }
    try {
      setSaving(true);
      const { error: deleteError } = await supabase
        .from("study_tasks")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (deleteError) {
        throw deleteError;
      }
      setTasks((current) => current.filter((task) => task.id !== id));
    } catch (err) {
      console.error("deleteTask error:", err);
      alert(err?.message || "تعذر حذف المهمة.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     NOTES CRUD
  ===================================================== */
  const openAddNote = () => {
    setEditingNote(null);
    setNoteForm({ ...EMPTY_NOTE });
    setShowNoteModal(true);
  };
  const openEditNote = (note) => {
    setEditingNote(note);
    setNoteForm({
      text: note.text || "",
    });
    setShowNoteModal(true);
  };
  const saveNote = async (event) => {
    event.preventDefault();
    if (!user) return;
    if (!noteForm.text.trim()) {
      alert("من فضلك اكتب الملاحظة.");
      return;
    }
    try {
      setSaving(true);
      const now = new Date().toISOString();
      if (editingNote) {
        const { data, error: updateError } = await supabase
          .from("study_notes")
          .update({
            content: noteForm.text.trim(),
            updated_at: now,
          })
          .eq("id", editingNote.id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (updateError) {
          throw updateError;
        }
        const formatted = formatNote(data);
        setNotes((current) => current.map((note) => note.id === data.id ? formatted : note));
      } else {
        const { data, error: insertError } = await supabase
          .from("study_notes")
          .insert({
            user_id: user.id,
            title: "ملاحظة اليوم",
            content: noteForm.text.trim(),
            status: "active",
            is_pinned: false,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        if (insertError) {
          throw insertError;
        }
        const formatted = formatNote(data);
        setNotes((current) => [formatted, ...current]);
      }
      setShowNoteModal(false);
      setEditingNote(null);
      setNoteForm({ ...EMPTY_NOTE });
    } catch (err) {
      console.error("saveNote error:", err);
      alert(err?.message || "تعذر حفظ الملاحظة.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     DELETE NOTE
  ===================================================== */
  const deleteNote = async (id) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذه الملاحظة؟");
    if (!confirmed || !user) {
      return;
    }
    try {
      setSaving(true);
      const { error: deleteError } = await supabase
        .from("study_notes")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (deleteError) {
        throw deleteError;
      }
      setNotes((current) => current.filter((note) => note.id !== id));
    } catch (err) {
      console.error("deleteNote error:", err);
      alert(err?.message || "تعذر حذف الملاحظة.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     PLAN SETTINGS
  ===================================================== */
  const savePlanSettings = async (event) => {
    event.preventDefault();
    if (!user || !plan) return;
    if (!planName.trim()) {
      alert("من فضلك اكتب اسم الخطة.");
      return;
    }
    try {
      setSaving(true);
      const { data, error: updateError } = await supabase
        .from("study_plans")
        .update({
          name: planName.trim(),
          goal: planGoal.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (updateError) {
        throw updateError;
      }
      setPlan(data);
      setPlanName(data.name || "خطتي الدراسية");
      setPlanGoal(data.goal || "");
      setShowPlanModal(false);
    } catch (err) {
      console.error("savePlanSettings error:", err);
      alert(err?.message || "تعذر حفظ الخطة.");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     SMART PLAN DATA
  ===================================================== */
  const smartPlanData = useMemo(() => {
    const incompleteTasks = tasks.filter(
      (task) => !task.checked
    );

    const lessonsFromTasks = incompleteTasks
      .map((task) => {
        if (!task.lesson_id) {
          return null;
        }

        const subject = findSubject(task.subject_id);

        const lesson = subject?.lessons?.find(
          (item) =>
            String(item.id) ===
            String(task.lesson_id)
        );

        if (!lesson) {
          return null;
        }

        return {
          ...lesson,
          subjectId: task.subject_id,
          unitId: task.unit_id,
          taskTitle: task.title,
        };
      })
      .filter(Boolean);

    const uniqueLessons = [];
    const seen = new Set();

    lessonsFromTasks.forEach((lesson) => {
      const key = String(lesson.id);

      if (!seen.has(key)) {
        seen.add(key);
        uniqueLessons.push(lesson);
      }
    });

    // لو مفيش مهام مرتبطة بدروس
    if (uniqueLessons.length === 0) {
      subjects.forEach((subject) => {
        if (uniqueLessons.length >= 4) {
          return;
        }

        (subject.lessons || []).forEach((lesson) => {
          if (uniqueLessons.length >= 4) {
            return;
          }

          uniqueLessons.push({
            ...lesson,
            subjectId: subject.id,
            unitId: lesson.unitId,
          });
        });
      });
    }

    return {
      incompleteTasks,
      lessons: uniqueLessons.slice(0, 4),
    };
  }, [tasks, subjects, findSubject]);

  /* =====================================================
     APPLY SMART PLAN
  ===================================================== */
  const applySmartPlan = async () => {
    if (!user || !plan || smartPlanLoading) {
      return;
    }
    try {
      setSmartPlanLoading(true);
      /*
       * أولًا نحذف جلسات اليوم
       * المرتبطة بالخطة الحالية.
       *
       * الهدف:
       * منع التكرار عند تشغيل
       * Smart Plan أكثر من مرة.
       */
      const { error: deleteError } = await supabase
        .from("study_plan_sessions")
        .delete()
        .eq("user_id", user.id)
        .eq("plan_id", plan.id)
        .eq("session_date", selectedDateDB);
      if (deleteError) {
        throw deleteError;
      }
      const newSessions = [];
      let currentMinutes = 9 * 60;
      const lessons = smartPlanData.lessons;
      lessons.forEach((lesson, index) => {
        const subject = findSubject(lesson.subjectId);
        const lessonTitle = lesson.title || "جلسة دراسة";
        const subjectName = subject?.name || "مذاكرة";
        const duration = 60;
        const start = currentMinutes;
        const end = start + duration;
        const startTime = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
        const endTime = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
        /*
         * مهم:
         * لا نرسل subject_id
         * أو unit_id
         * أو lesson_id
         * إلى study_plan_sessions.
         *
         * بدلًا من ذلك نضع المادة
         * والدرس داخل title/subtitle.
         */
        newSessions.push({
          user_id: user.id,
          plan_id: plan.id,
          session_date: selectedDateDB,
          start_time: startTime,
          end_time: endTime,
          title: subjectName,
          subtitle: lessonTitle,
          type: getSessionTypeFromSubject(subject),
          priority: index === 0 ? "high" : "medium",
        });
        currentMinutes = end + 15;
      });
      /*
       * لو مفيش دروس:
       * نعمل جلسة عامة.
       */
      if (newSessions.length === 0) {
        newSessions.push({
          user_id: user.id,
          plan_id: plan.id,
          session_date: selectedDateDB,
          start_time: "09:00",
          end_time: "10:00",
          title: "جلسة دراسة مركزة",
          subtitle: "ابدأ بالمادة التي تحتاج أكبر قدر من التركيز",
          type: "study",
          priority: "high",
        });
      }
      const { data, error: insertError } = await supabase
        .from("study_plan_sessions")
        .insert(newSessions)
        .select();
      if (insertError) {
        throw insertError;
      }
      const formatted = (data || []).map(formatSession);
      setSessions(formatted.sort((a, b) => a.startTime.localeCompare(b.startTime)));
      setShowSmartPlanModal(false);
    } catch (err) {
      console.error("applySmartPlan error:", err);
      alert(err?.message || "تعذر تطبيق الخطة الذكية.");
    } finally {
      setSmartPlanLoading(false);
    }
  };

  /* =====================================================
     LOADING
  ===================================================== */
  if (loading) {
    return (
      <main className="plan-page">
        <Header />
        <div className="page-loading">
          <div className="page-loading-spinner"><FiRefreshCw /></div>
          <h3>جاري تجهيز خطتك الدراسية...</h3>
          <p>بنحمّل جدول مذاكرتك ومهامك وخطة اليوم.</p>
        </div>
      </main>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */
  if (error) {
    return (
      <main className="plan-page">
        <Header />
        <div className="plan-error">
          <FaTimes />
          <h3>تعذر تحميل الخطة</h3>
          <p>{error}</p>
          <button type="button" onClick={() => user && loadDayData(user)}>إعادة المحاولة</button>
        </div>
      </main>
    );
  }

  /* =====================================================
    RENDER
  ===================================================== */
  return (
    <main className="plan-page">
      <Header />
      {/* =====================================================
        STATS
      ===================================================== */}
      <section className="plan-stats-grid">
        <div className="plan-stat-card">
          <div className="stat-card-content">
            <div className="stat-text">
              <h3>نسبة الإكمال</h3>
              <strong>{completionPercentage}%</strong>
              <span>من المهام اليومية</span>
            </div>
            <div className="stat-icon"><FaChartPie /></div>
          </div>
          <div className="completion-circle" style={{ background: `conic-gradient(
            #3156d9 0deg,
            #3156d9 ${progressDegrees}deg,
            #e8ebf3 ${progressDegrees}deg,
            #e8ebf3 360deg
          )` }}>
            <div className="completion-inner"><strong>{completionPercentage}%</strong></div>
          </div>
        </div>
        <div className="plan-stat-card">
          <div className="stat-card-content">
            <div className="stat-text">
              <h3>المهام المخططة</h3>
              <strong>{totalTasks}</strong>
              <span>{completedTasks} مكتملة</span>
            </div>
            <div className="stat-icon"><FaTasks /></div>
          </div>
        </div>
        <div className="plan-stat-card">
          <div className="stat-card-content">
            <div className="stat-text">
              <h3>جلسات اليوم</h3>
              <strong>{sessions.length}</strong>
              <span>جلسة مخططة</span>
            </div>
            <div className="stat-icon"><FaCalendarAlt /></div>
          </div>
        </div>
        <div className="plan-stat-card">
          <div className="stat-card-content">
            <div className="stat-text">
              <h3>ساعات الخطة اليوم</h3>
              <strong>{formatMinutes(studyMinutes)}</strong>
              <span>إجمالي {formatMinutes(totalPlanMinutes)}</span>
              <div className="stat-progress-row">
                <div className="stat-progress">
                  <div style={{ width: `${totalPlanMinutes > 0 ? Math.min(100, (studyMinutes / totalPlanMinutes) * 100) : 0}%` }} />
                </div>
                <small>{totalPlanMinutes > 0 ? Math.round((studyMinutes / totalPlanMinutes) * 100) : 0}%</small>
              </div>
            </div>
            <div className="stat-icon"><FaClock /></div>
          </div>
        </div>
      </section>
      {/* =====================================================
        TOOLS
      ===================================================== */}
      <section className="plan-tools">
        <button type="button" className="smart-plan-btn" onClick={() => setShowSmartPlanModal(true)}><FaMagic /><span>اقتراح خطة ذكية</span></button>
        <div className="date-controls">
          <button type="button" className="date-arrow" onClick={() => changeDate(1)} title="اليوم التالي"><FaChevronRight /></button>
          <button type="button" className="current-date" onClick={goToday} title="العودة لليوم"><FaCalendarAlt />{formatDateArabic(selectedDate)}</button>
          <button type="button" className="date-arrow" onClick={() => changeDate(-1)} title="اليوم السابق"><FaChevronLeft /></button>
        </div>
        <button type="button" className="edit-plan-btn" onClick={() => setShowPlanModal(true)}><FaPen />تعديل الخطة</button>
      </section>
      {/* =====================================================
        MAIN CONTENT
      ===================================================== */}
      <section className="plan-content">
        <div className="plan-sidebar">
          {/* OVERVIEW */}
          <div className="plan-box overview-box">
            <div className="box-header"><h2>نظرة عامة على اليوم</h2><FaChartPie /></div>
            <div className="overview-content">
              <div className="donut-chart">
                <div className="donut-inner"><strong>{formatMinutes(studyMinutes)}</strong><span>وقت الدراسة</span></div>
              </div>
              <div className="overview-list">
                <div><span className="overview-dot study" /><p>دراسة</p><strong>{formatMinutes(studyMinutes)}</strong></div>
                <div><span className="overview-dot break" /><p>استراحة</p><strong>{formatMinutes(breakMinutes)}</strong></div>
                <div><span className="overview-dot meal" /><p>غداء</p><strong>{formatMinutes(mealMinutes)}</strong></div>
                <div><span className="overview-dot review" /><p>مراجعة</p><strong>{formatMinutes(reviewMinutes)}</strong></div>
              </div>
            </div>
            <div className="total-hours"><span>إجمالي الساعات</span><strong>{formatMinutes(totalPlanMinutes)}</strong></div>
          </div>
          {/* TASKS */}
          <div className="plan-box tasks-box">
            <div className="box-header"><h2>مهام اليوم</h2><span className="task-count">{completedTasks} / {totalTasks} مكتملة</span></div>
            <div className="task-progress"><div style={{ width: `${completionPercentage}%` }} /></div>
            <div className="tasks-list">
              {tasks.length === 0 ? (
                <div className="empty-plan">لا توجد مهام</div>
              ) : (
                tasks.map((task) => (
                  <div className={`task-item ${task.checked ? "completed" : ""}`} key={task.id}>
                    <label className="task-check-area">
                      <input type="checkbox" checked={task.checked} onChange={() => toggleTask(task.id)} />
                      <span className="custom-checkbox">{task.checked && <FaCheckCircle />}</span>
                      <span>{task.title}</span>
                    </label>
                    <div className="task-actions">
                      <button type="button" onClick={() => openEditTask(task)} title="تعديل"><FaPen /></button>
                      <button type="button" onClick={() => deleteTask(task.id)} title="حذف"><FaTrash /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="task-footer-actions">
              <button type="button" className="box-button" onClick={openAddTask}><FaPlus />إضافة مهمة</button>
            </div>
          </div>
          {/* NOTES */}
          <div className="plan-box notes-box">
            <div className="box-header"><h2>ملاحظات اليوم</h2><FaLightbulb /></div>
            <div className="notes-list">
              {notes.length === 0 ? (
                <div className="empty-plan">لا توجد ملاحظات</div>
              ) : (
                notes.map((note) => (
                  <div className="note-item" key={note.id}>
                    <div className="note-content">
                      <span>📌</span>
                      <p>{note.text.split("\n").map((line, index) => <React.Fragment key={index}>{line}{index < note.text.split("\n").length - 1 && <br />}</React.Fragment>)}</p>
                    </div>
                    <div className="note-actions">
                      <button type="button" onClick={() => openEditNote(note)}><FaPen /></button>
                      <button type="button" onClick={() => deleteNote(note.id)}><FaTrash /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button type="button" className="box-button" onClick={openAddNote}><FaPlus />إضافة ملاحظة</button>
          </div>
        </div>
        {/* SCHEDULE */}
        <div className="schedule-section">
          <div className="schedule-header">
            <div><h2>جدول اليوم</h2><p>{planName} — {formatDateArabic(selectedDate)}</p></div>
            <FaCalendarAlt />
          </div>
          <div className="schedule-list">
            {sessions.length === 0 ? (
              <div className="schedule-empty">
                <FaCalendarAlt />
                <h3>لا توجد جلسات</h3>
                <p>أضف جلسة جديدة أو استخدم الخطة الذكية</p>
                <button type="button" onClick={openAddSession} className="add-session-btn"><FaPlus />إضافة جلسة</button>
              </div>
            ) : (
              sessions.map((item, index) => {
                const duration = calculateDuration(item.startTime, item.endTime);
                return (
                  <div className="schedule-item" key={item.id}>
                    <div className="schedule-line"><span /></div>
                    <div className="schedule-time">{item.startTime} - {item.endTime}</div>
                    <div className="schedule-info">
                      <div className={`subject-icon subject-${index % 9}`}>{getSessionIcon(item.type)}</div>
                      <div className="subject-details">
                        <h3>{item.title}</h3>
                        {item.subtitle && <p>{item.subtitle}</p>}
                      </div>
                      {item.priority && <span className={`priority ${item.priority}`}>{item.priority === "high" && "أولوية عالية"}{item.priority === "medium" && "أولوية متوسطة"}{item.priority === "low" && "أولوية منخفضة"}</span>}
                    </div>
                    <div className="schedule-actions">
                      <span className="duration"><FaClock />{formatMinutes(duration)}</span>
                      <div className="session-actions">
                        <button type="button" onClick={() => openEditSession(item)} title="تعديل الجلسة"><FaPen /></button>
                        <button type="button" className="delete-action" onClick={() => deleteSession(item.id)} title="حذف الجلسة"><FaTrash /></button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {sessions.length > 0 && <button type="button" className="add-session-btn" onClick={openAddSession}><FaPlus />إضافة جلسة</button>}
        </div>
      </section>
      {/* =====================================================
        TIP
      ===================================================== */}
      <section className="plan-tip">
        <div className="tip-icon"><FaLightbulb /></div>
        <p>نصيحة: ابدأ بالمادة الأصعب عندما يكون تركيزك في أعلى مستوياته، وخذ فترات راحة قصيرة بين جلسات المذاكرة.</p>
        <button type="button" onClick={() => setShowSmartPlanModal(true)}>اقتراح خطة ذكية<FaMagic /></button>
      </section>
      {/* =====================================================
        SESSION MODAL
      ===================================================== */}
      {showSessionModal && (
        <div className="plan-modal-overlay" onMouseDown={() => setShowSessionModal(false)}>
          <div className="plan-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>{editingSession ? "تعديل الجلسة" : "إضافة جلسة"}</h2><p>أضف تفاصيل الجلسة التي ستدرسها اليوم</p></div>
              <button type="button" onClick={() => setShowSessionModal(false)}><FaTimes /></button>
            </div>
            <form className="plan-form" onSubmit={saveSession}>
              <div className="form-row">
                <div className="form-group">
                  <label>وقت البداية</label>
                  <input type="time" value={sessionForm.startTime} onChange={(e) => setSessionForm((current) => ({ ...current, startTime: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>وقت النهاية</label>
                  <input type="time" value={sessionForm.endTime} onChange={(e) => setSessionForm((current) => ({ ...current, endTime: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label>اسم الجلسة</label>
                <input type="text" placeholder="مثال: مذاكرة فيزياء" value={sessionForm.title} onChange={(e) => setSessionForm((current) => ({ ...current, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>الوصف</label>
                <input type="text" placeholder="مثال: مراجعة الدرس وحل الأسئلة" value={sessionForm.subtitle} onChange={(e) => setSessionForm((current) => ({ ...current, subtitle: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>نوع الجلسة</label>
                  <select value={sessionForm.type} className="global-select" onChange={(e) => setSessionForm((current) => ({ ...current, type: e.target.value }))}>
                    <option value="study">دراسة</option>
                    <option value="physics">فيزياء</option>
                    <option value="chemistry">كيمياء</option>
                    <option value="biology">أحياء</option>
                    <option value="arabic">عربي</option>
                    <option value="questions">حل أسئلة</option>
                    <option value="review">مراجعة</option>
                    <option value="break">استراحة</option>
                    <option value="meal">غداء</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>الأولوية</label>
                  <select className="global-select" value={sessionForm.priority} onChange={(e) => setSessionForm((current) => ({ ...current, priority: e.target.value }))}>
                    <option value="">بدون أولوية</option>
                    <option value="high">أولوية عالية</option>
                    <option value="medium">أولوية متوسطة</option>
                    <option value="low">أولوية منخفضة</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowSessionModal(false)}>إلغاء</button>
                <button type="submit" className="save-btn" disabled={saving}>{saving ? <FaSpinner className="plan-inline-spinner" /> : <FaSave />}{editingSession ? "حفظ التعديلات" : "إضافة الجلسة"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =====================================================
        TASK MODAL
      ===================================================== */}
      {showTaskModal && (
        <div className="plan-modal-overlay" onMouseDown={() => setShowTaskModal(false)}>
          <div className="plan-modal small-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>{editingTask ? "تعديل المهمة" : "إضافة مهمة"}</h2><p>اربط المهمة بالمادة والدرس المطلوب</p></div>
              <button type="button" onClick={() => setShowTaskModal(false)}><FaTimes /></button>
            </div>
            <form className="plan-form" onSubmit={saveTask}>
              <div className="form-group">
                <label>اسم المهمة</label>
                <input type="text" placeholder="مثال: حل 30 سؤال" value={taskForm.title} onChange={(e) => setTaskForm((current) => ({ ...current, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>المادة</label>
                <select className="global-select" value={taskForm.subjectId} onChange={(e) => setTaskForm((current) => ({ ...current, subjectId: e.target.value, unitId: "", lessonId: "" }))}>
                  <option value="">بدون مادة</option>
                  {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>الوحدة</label>
                  <select className="global-select" value={taskForm.unitId} onChange={(e) => setTaskForm((current) => ({ ...current, unitId: e.target.value, lessonId: "" }))} disabled={!taskForm.subjectId}>
                    <option value="">كل الوحدات</option>
                    {taskUnits.map((unit) => (<option key={unit.id} value={unit.id}>{unit.title}</option>))}
                    </select>
                </div>
                <div className="form-group">
                  <label>الدرس</label>
                  <select className="global-select" value={taskForm.lessonId} onChange={(e) => setTaskForm((current) => ({ ...current, lessonId: e.target.value }))} disabled={!taskForm.subjectId}>
                    <option value="">بدون درس</option>{taskLessons.map((lesson) => (<option key={lesson.id} value={lesson.id}>{lesson.title}</option>))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>الأولوية</label>
                  <select className="global-select" value={taskForm.priority} onChange={(e) => setTaskForm((current) => ({ ...current, priority: e.target.value }))}>
                    <option value="">بدون أولوية</option>
                    <option value="high">عالية</option>
                    <option value="medium">متوسطة</option>
                    <option value="low">منخفضة</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>مدة المهمة بالدقائق</label>
                  <input type="number" min="1" placeholder="30" value={taskForm.durationMinutes} onChange={(e) => setTaskForm((current) => ({ ...current, durationMinutes: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>وقت المهمة</label>
                <input type="time" value={taskForm.dueTime} onChange={(e) => setTaskForm((current) => ({ ...current, dueTime: e.target.value }))} />
              </div>
              <label className="modal-check">
                <input type="checkbox" checked={taskForm.checked} onChange={(e) => setTaskForm((current) => ({ ...current, checked: e.target.checked }))} />
                <span>المهمة مكتملة</span>
              </label>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowTaskModal(false)}>إلغاء</button>
                <button type="submit" className="save-btn" disabled={saving}>{saving ? <FaSpinner className="plan-inline-spinner" /> : <FaSave />}{editingTask ? "حفظ التعديلات" : "إضافة المهمة"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =====================================================
        NOTE MODAL
      ===================================================== */}
      {showNoteModal && (
        <div className="plan-modal-overlay" onMouseDown={() => setShowNoteModal(false)}>
          <div className="plan-modal small-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>{editingNote ? "تعديل الملاحظة" : "إضافة ملاحظة"}</h2><p>أضف ملاحظة تساعدك في يومك</p></div>
              <button type="button" onClick={() => setShowNoteModal(false)}><FaTimes /></button>
            </div>
            <form className="plan-form" onSubmit={saveNote}>
              <div className="form-group">
                <label>الملاحظة</label>
                <textarea rows="6" placeholder="اكتب ملاحظتك هنا..." value={noteForm.text} onChange={(e) => setNoteForm((current) => ({ ...current, text: e.target.value }))} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowNoteModal(false)}>إلغاء</button>
                <button type="submit" className="save-btn" disabled={saving}>{saving ? <FaSpinner className="plan-inline-spinner" /> : <FaSave />}{editingNote ? "حفظ التعديلات" : "إضافة الملاحظة"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =====================================================
        PLAN SETTINGS MODAL
      ===================================================== */}
      {showPlanModal && (
        <div className="plan-modal-overlay" onMouseDown={() => setShowPlanModal(false)}>
          <div className="plan-modal small-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2>تعديل الخطة</h2><p>عدّل اسم الخطة والهدف الأساسي</p></div>
              <button type="button" onClick={() => setShowPlanModal(false)}><FaTimes /></button>
            </div>
            <form className="plan-form" onSubmit={savePlanSettings}>
              <div className="form-group">
                <label>اسم الخطة</label>
                <input type="text" value={planName} onChange={(e) => setPlanName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>الهدف</label>
                <textarea rows="4" value={planGoal} onChange={(e) => setPlanGoal(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowPlanModal(false)}>إلغاء</button>
                <button type="submit" className="save-btn" disabled={saving}>{saving ? <FaSpinner className="plan-inline-spinner" /> : <FaSave />}حفظ الخطة</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =====================================================
        SMART PLAN MODAL
      ===================================================== */}
      {showSmartPlanModal && (
        <div className="plan-modal-overlay" onMouseDown={() => !smartPlanLoading && setShowSmartPlanModal(false)}>
          <div className="plan-modal smart-plan-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header smart-modal-header">
              <div className="smart-modal-title">
                <div className="smart-modal-icon"><FaMagic /></div>
                <div><h2>اقتراح خطة ذكية</h2><p>الخطة تعتمد على المهام والدروس الموجودة عندك</p></div>
              </div>
              <button type="button" disabled={smartPlanLoading} onClick={() => setShowSmartPlanModal(false)}><FaTimes /></button>
            </div>
            {smartPlanLoading ? (
              <div className="smart-plan-generating">
                <FaSpinner />
                <strong>جاري إنشاء الخطة...</strong>
                <p>يتم ترتيب جلسات الدراسة بناءً على الدروس والمهام.</p>
              </div>
            ) : (
              <>
                <div className="smart-plan-content">
                  <div className="smart-plan-message">
                    <FaLightbulb />
                    <div><strong>اقتراحنا ليومك</strong><p>سنبدأ بالمهام غير المكتملة، ثم نضيف الدروس المتاحة من منهجك.</p></div>
                  </div>
                  <div className="smart-plan-stats">
                    <div><span>وقت الدراسة الحالي</span><strong>{formatMinutes(studyMinutes)}</strong></div>
                    <div><span>المهام المتبقية</span><strong>{smartPlanData.incompleteTasks.length}</strong></div>
                    <div><span>دروس مقترحة</span><strong>{smartPlanData.lessons.length}</strong></div>
                  </div>
                  <div className="smart-plan-list">
                    {smartPlanData.lessons.length === 0 ? (
                      <div className="empty-plan">لا توجد دروس متاحة للاقتراح.</div>
                    ) : (
                      smartPlanData.lessons.map((lesson, index) => {
                        const subject = findSubject(lesson.subjectId);
                        return (
                          <div className="smart-plan-item" key={`${lesson.id}-${index}`}>
                            <div className="smart-step-icon"><FaBookOpen /></div>
                            <div><strong>{subject?.name}{" — "}{lesson.title}</strong><span>جلسة تركيز {index + 1} • 60 دقيقة</span></div>
                            <FaCheck />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="modal-actions smart-modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowSmartPlanModal(false)}>إلغاء</button>
                  <button type="button" className="save-btn" onClick={applySmartPlan} disabled={smartPlanData.lessons.length === 0}><FaMagic />تطبيق الخطة المقترحة</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default Plan;