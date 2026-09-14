import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaCheck,
  FaExclamationCircle,
  FaCalendarAlt,
  FaFilter,
  FaSearch,
  FaChevronDown,
  FaPlus,
  FaEllipsisV,
  FaArrowDown,
  FaArrowLeft,
  FaBook,
  FaFlask,
  FaAtom,
  FaLanguage,
  FaLeaf,
  FaClock,
  FaEdit,
  FaTrash,
  FaTimes,
} from "react-icons/fa";

import Swal from "sweetalert2";

import Header from "../../components/Header/Header";
import { supabase } from "../../utils/supabaseClient";

import "./Tasks.css";

/* =========================================================
   HELPERS
========================================================= */

const getLocalDate = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateString) => {
  if (!dateString) {
    return "بدون موعد";
  }

  const date = new Date(`${dateString}T00:00:00`);

  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
  }).format(date);
};

const getDueLabel = (dueDate) => {
  if (!dueDate) {
    return "بدون موعد";
  }

  const today = getLocalDate();

  const todayDate = new Date(`${today}T00:00:00`);
  const dueDateObject = new Date(`${dueDate}T00:00:00`);

  const difference = Math.round(
    (dueDateObject - todayDate) /
      (1000 * 60 * 60 * 24)
  );

  if (difference < 0) {
    return "متأخرة";
  }

  if (difference === 0) {
    return "اليوم";
  }

  if (difference === 1) {
    return "غدًا";
  }

  if (difference === 2) {
    return "بعد يومين";
  }

  return `بعد ${difference} أيام`;
};

/* =========================================================
   SUBJECT ICON
========================================================= */

const getSubjectIcon = (subject) => {
  const type = String(
    subject?.type || ""
  ).toLowerCase();

  const name = String(
    subject?.name || ""
  ).toLowerCase();

  if (
    type.includes("physics") ||
    name.includes("فيزياء")
  ) {
    return {
      icon: <FaAtom />,
      className: "physics",
    };
  }

  if (
    type.includes("chemistry") ||
    name.includes("كيمياء")
  ) {
    return {
      icon: <FaFlask />,
      className: "chemistry",
    };
  }

  if (
    type.includes("biology") ||
    name.includes("أحياء") ||
    name.includes("احياء")
  ) {
    return {
      icon: <FaLeaf />,
      className: "biology",
    };
  }

  if (
    type.includes("english") ||
    name.includes("إنجليزي") ||
    name.includes("انجليزي")
  ) {
    return {
      icon: <FaLanguage />,
      className: "english",
    };
  }

  return {
    icon: <FaBook />,
    className: "arabic",
  };
};

/* =========================================================
   PRIORITY
========================================================= */

const priorityLabels = {
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

const getPriorityLabel = (priority) => {
  return priorityLabels[priority] || "—";
};

const getPriorityClass = (priority) => {
  if (priority === "high") {
    return "عالية";
  }

  if (priority === "medium") {
    return "متوسطة";
  }

  if (priority === "low") {
    return "منخفضة";
  }

  return "";
};

/* =========================================================
   COMPONENT
========================================================= */

const Tasks = () => {
  /* =======================================================
     AUTH / LOADING
  ======================================================= */

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* =======================================================
     DATA
  ======================================================= */

  const [tasks, setTasks] = useState([]);

  const [subjectsData, setSubjectsData] =
    useState([]);

  const [unitsData, setUnitsData] =
    useState([]);

  const [lessonsData, setLessonsData] =
    useState([]);

  /* =======================================================
     FILTERS
  ======================================================= */

  const [activeTab, setActiveTab] =
    useState("كل المهام");

  const [search, setSearch] =
    useState("");

  const [selectedSubject, setSelectedSubject] =
    useState("كل المواد");

  const [selectedPriority, setSelectedPriority] =
    useState("كل الأولويات");

  const [sortBy, setSortBy] =
    useState("الأحدث");

  /* =======================================================
     MODAL
  ======================================================= */

  const [showTaskModal, setShowTaskModal] =
    useState(false);

  const [editingTask, setEditingTask] =
    useState(null);

  const [openMenuId, setOpenMenuId] =
    useState(null);

  const [formData, setFormData] = useState({
    title: "",
    subjectId: "",
    unitId: "",
    lessonId: "",
    priority: "",
    durationMinutes: "",
    dueDate: "",
    dueTime: "",
  });

  /* =======================================================
     STATIC LABELS
  ======================================================= */

  const priorities = [
    {
      value: "كل الأولويات",
      label: "كل الأولويات",
    },
    {
      value: "high",
      label: "عالية",
    },
    {
      value: "medium",
      label: "متوسطة",
    },
    {
      value: "low",
      label: "منخفضة",
    },
  ];

  const tabs = [
    "كل المهام",
    "متأخرة",
    "مكتملة",
    "المقبلة",
    "مهام اليوم",
  ];

  /* =======================================================
     GET CURRENT USER
  ======================================================= */

  const getCurrentUser = useCallback(
    async () => {
      const {
        data,
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      const sessionUser =
        data?.session?.user;

      if (sessionUser?.id) {
        return sessionUser;
      }

      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!userData?.user?.id) {
        throw new Error(
          "لا توجد جلسة تسجيل دخول. سجل الدخول مرة أخرى."
        );
      }

      return userData.user;
    },
    []
  );

  /* =======================================================
     FETCH SUBJECTS
  ======================================================= */

  const fetchSubjects = useCallback(
    async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "يجب تسجيل الدخول أولاً"
        );
      }

      /* -----------------------------------------------
        Student Profile
      ------------------------------------------------ */

      const {
        data: profileData,
        error: profileError,
      } = await supabase
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
        throw new Error(
          "لم يتم العثور على بيانات الطالب"
        );
      }

      const gradeLevel =
        profileData.grade_level?.trim();

      const educationSystem =
        profileData.education_system?.trim();

      const track =
        profileData.track?.trim();

      /* -----------------------------------------------
        Validate Grade
      ------------------------------------------------ */

      if (!gradeLevel) {
        throw new Error(
          "لم يتم تحديد الصف الدراسي"
        );
      }

      /* =================================================
        FIRST / SECOND SECONDARY
        
        الجديد:
        subject_curriculum_access
      ================================================= */

      if (
        gradeLevel ===
          "first_secondary" ||
        gradeLevel ===
          "second_secondary"
      ) {
        if (!educationSystem) {
          throw new Error(
            "لم يتم تحديد نظام التعليم"
          );
        }

        let query = supabase
          .from(
            "subject_curriculum_access"
          )
          .select(`
            subject_id,
            grade_level,
            education_system,
            track,
            subjects (
              id,
              name,
              subtitle,
              type,
              icon,
              icon_class,
              is_active,
              slug
            )
          `)
          .eq(
            "grade_level",
            gradeLevel
          )
          .eq(
            "education_system",
            educationSystem
          );

        /*
          لو الطالب عنده Track:
          نجيب المواد الخاصة بالـ track
          بالإضافة للمواد العامة track = null
        */

        if (track) {
          query = query.or(
            `track.eq.${track},track.is.null`
          );
        } else {
          query = query.is(
            "track",
            null
          );
        }

        const {
          data: accessData,
          error: accessError,
        } = await query;

        if (accessError) {
          throw accessError;
        }

        const subjectsMap =
          new Map();

        (accessData || []).forEach(
          (item) => {
            const subject =
              item.subjects;

            if (
              !subject ||
              !subject.is_active
            ) {
              return;
            }

            subjectsMap.set(
              subject.id,
              subject
            );
          }
        );

        return Array.from(
          subjectsMap.values()
        ).sort((a, b) =>
          String(
            a.name || ""
          ).localeCompare(
            String(
              b.name || ""
            ),
            "ar"
          )
        );
      }

      /* =================================================
        THIRD SECONDARY
        
        القديم:
        sections + subject_sections
      ================================================= */

      if (
        gradeLevel ===
        "third_secondary"
      ) {
        const studentSection =
          profileData.section?.trim();

        if (!studentSection) {
          throw new Error(
            "لم يتم تحديد شعبة الطالب"
          );
        }

        /* -----------------------------------------------
          Section
        ------------------------------------------------ */

        const {
          data: sectionData,
          error: sectionError,
        } = await supabase
          .from("sections")
          .select(`
            id,
            name
          `)
          .eq(
            "name",
            studentSection
          )
          .maybeSingle();

        if (sectionError) {
          throw sectionError;
        }

        if (!sectionData) {
          throw new Error(
            `لم يتم العثور على الشعبة "${studentSection}"`
          );
        }

        /* -----------------------------------------------
          Subjects
        ------------------------------------------------ */

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
              type,
              icon,
              icon_class,
              is_active,
              slug
            )
          `)
          .eq(
            "section_id",
            sectionData.id
          );

        if (
          subjectSectionsError
        ) {
          throw subjectSectionsError;
        }

        const subjectsMap =
          new Map();

        (
          subjectSectionsData || []
        ).forEach((item) => {
          const subject =
            item.subjects;

          if (
            !subject ||
            !subject.is_active
          ) {
            return;
          }

          subjectsMap.set(
            subject.id,
            subject
          );
        });

        return Array.from(
          subjectsMap.values()
        ).sort((a, b) =>
          String(
            a.name || ""
          ).localeCompare(
            String(
              b.name || ""
            ),
            "ar"
          )
        );
      }

      throw new Error(
        "نوع الصف الدراسي غير مدعوم."
      );
    },
    []
  );

  /* =======================================================
     FETCH UNITS
     
     NEW CURRICULUM:
     units
  ======================================================= */

  const fetchUnits = useCallback(
    async (subjectIds = []) => {
      if (!subjectIds.length) {
        return [];
      }

      const {
        data,
        error,
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
        .in(
          "subject_id",
          subjectIds
        )
        .eq(
          "is_active",
          true
        )
        .order(
          "sort_order",
          {
            ascending: true,
          }
        );

      if (error) {
        throw error;
      }

      return data || [];
    },
    []
  );

  /* =======================================================
     FETCH LESSONS
     
     NEW CURRICULUM:
     lessons
  ======================================================= */

  const fetchLessons = useCallback(
    async (unitIds = []) => {
      if (!unitIds.length) {
        return [];
      }

      const {
        data,
        error,
      } = await supabase
        .from("lessons")
        .select(`
          id,
          unit_id,
          title,
          sort_order,
          is_active
        `)
        .in(
          "unit_id",
          unitIds
        )
        .eq(
          "is_active",
          true
        )
        .order(
          "sort_order",
          {
            ascending: true,
          }
        );

      if (error) {
        throw error;
      }

      return data || [];
    },
    []
  );

  /* =======================================================
     FETCH TASKS
  ======================================================= */

  const fetchTasks = useCallback(
    async (currentUser) => {
      if (!currentUser?.id) {
        return [];
      }

      const {
        data,
        error,
      } = await supabase
        .from("study_tasks")
        .select(`
          id,
          user_id,
          plan_id,
          plan_date,
          title,
          is_completed,
          completed_at,
          created_at,
          updated_at,
          subject_id,
          unit_id,
          lesson_id,
          priority,
          duration_minutes,
          due_date,
          due_time
        `)
        .eq(
          "user_id",
          currentUser.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          "FETCH TASKS ERROR:",
          error
        );

        throw error;
      }

      return data || [];
    },
    []
  );

  /* =======================================================
     MAP TASKS
  ======================================================= */

  const mapTasks = useCallback(
    (
      tasksData,
      subjects,
      units,
      lessons
    ) => {
      return (
        tasksData || []
      ).map((task) => ({
        ...task,

        subjects:
          subjects.find(
            (subject) =>
              subject.id ===
              task.subject_id
          ) || null,

        units:
          units.find(
            (unit) =>
              unit.id ===
              task.unit_id
          ) || null,

        lessons:
          lessons.find(
            (lesson) =>
              lesson.id ===
              task.lesson_id
          ) || null,
      }));
    },
    []
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);

        /* -----------------------------------------------
           User
        ------------------------------------------------ */

        const currentUser =
          await getCurrentUser();

        if (!mounted) {
          return;
        }

        setUser(currentUser);

        /* -----------------------------------------------
           Subjects
        ------------------------------------------------ */

        const subjects =
          await fetchSubjects();

        if (!mounted) {
          return;
        }

        const subjectIds =
          subjects.map(
            (subject) =>
              subject.id
          );

        /* -----------------------------------------------
           Units
        ------------------------------------------------ */

        const units =
          await fetchUnits(
            subjectIds
          );

        if (!mounted) {
          return;
        }

        const unitIds =
          units.map(
            (unit) =>
              unit.id
          );

        /* -----------------------------------------------
           Lessons
        ------------------------------------------------ */

        const lessons =
          await fetchLessons(
            unitIds
          );

        if (!mounted) {
          return;
        }

        /* -----------------------------------------------
           Tasks
        ------------------------------------------------ */

        const tasksData =
          await fetchTasks(
            currentUser
          );

        if (!mounted) {
          return;
        }

        /* -----------------------------------------------
           Save data to state
        ------------------------------------------------ */

        setSubjectsData(
          subjects
        );

        setUnitsData(
          units
        );

        setLessonsData(
          lessons
        );

        /* -----------------------------------------------
           IMPORTANT:
           استخدم الـ arrays المحلية
           وليس الـ state لأنها async
        ------------------------------------------------ */

        const mappedTasks =
          mapTasks(
            tasksData,
            subjects,
            units,
            lessons
          );

        setTasks(
          mappedTasks
        );
      } catch (error) {
        console.error(
          "TASKS LOAD ERROR:",
          error
        );

        if (mounted) {
          Swal.fire({
            icon: "error",
            title: "حدث خطأ",
            text:
              error?.message ||
              "تعذر تحميل المهام.",
            confirmButtonText:
              "حسنًا",
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [
    getCurrentUser,
    fetchSubjects,
    fetchUnits,
    fetchLessons,
    fetchTasks,
    mapTasks,
  ]);

  /* =======================================================
     SUBJECT CHANGE
  ======================================================= */

  const handleSubjectChange = (
    subjectId
  ) => {
    setFormData(
      (current) => ({
        ...current,
        subjectId,
        unitId: "",
        lessonId: "",
      })
    );
  };

  /* =======================================================
     UNIT CHANGE
  ======================================================= */

  const handleUnitChange = (
    unitId
  ) => {
    setFormData(
      (current) => ({
        ...current,
        unitId,
        lessonId: "",
      })
    );
  };

  /* =======================================================
     OPEN ADD MODAL
  ======================================================= */

  const openAddModal = () => {
    setEditingTask(null);

    setFormData({
      title: "",
      subjectId: "",
      unitId: "",
      lessonId: "",
      priority: "",
      durationMinutes: "",
      dueDate: getLocalDate(),
      dueTime: "",
    });

    setOpenMenuId(null);

    setShowTaskModal(true);
  };

  /* =======================================================
     OPEN EDIT MODAL
  ======================================================= */

  const openEditModal = (
    task
  ) => {
    setEditingTask(task);

    setOpenMenuId(null);

    setFormData({
      title:
        task.title || "",

      subjectId:
        task.subject_id || "",

      unitId:
        task.unit_id || "",

      lessonId:
        task.lesson_id || "",

      priority:
        task.priority || "",

      durationMinutes:
        task.duration_minutes ??
        "",

      dueDate:
        task.due_date || "",

      dueTime: task.due_time
        ? String(
            task.due_time
          ).slice(0, 5)
        : "",
    });

    setShowTaskModal(true);
  };

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeTaskModal = () => {
    if (saving) {
      return;
    }

    setShowTaskModal(false);
    setEditingTask(null);
  };

  /* =======================================================
     SAVE TASK
  ======================================================= */

  const handleSaveTask = async (
    event
  ) => {
    event.preventDefault();

    if (!user?.id) {
      Swal.fire({
        icon: "error",
        title: "انتهت الجلسة",
        text: "سجل الدخول مرة أخرى.",
        confirmButtonText:
          "حسنًا",
      });

      return;
    }

    const title =
      formData.title.trim();

    if (!title) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title:
          "اكتب اسم المهمة أولًا",
        showConfirmButton: false,
        timer: 2500,
      });

      return;
    }

    try {
      setSaving(true);

      const taskDate =
        formData.dueDate ||
        getLocalDate();

      /* -----------------------------------------------
         Plan
      ------------------------------------------------ */

      let planId =
        editingTask?.plan_id ||
        null;

      if (
        !editingTask ||
        !planId
      ) {
        const {
          data: planData,
          error: planError,
        } = await supabase
          .from("study_plans")
          .select("id")
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "plan_date",
            taskDate
          )
          .maybeSingle();

        if (planError) {
          console.warn(
            "PLAN LOOKUP WARNING:",
            planError
          );
        }

        planId =
          planData?.id ||
          null;
      }

      /* -----------------------------------------------
         Payload
         
         IMPORTANT:
         priority:
         high / medium / low

         unit_id:
         units.id

         lesson_id:
         lessons.id
      ------------------------------------------------ */

      const payload = {
        user_id:
          user.id,

        plan_id:
          planId,

        plan_date:
          taskDate,

        title,

        subject_id:
          formData.subjectId ||
          null,

        unit_id:
          formData.unitId ||
          null,

        lesson_id:
          formData.lessonId ||
          null,

        priority:
          formData.priority ||
          null,

        duration_minutes:
          formData.durationMinutes ===
          ""
            ? null
            : Number(
                formData.durationMinutes
              ),

        due_date:
          formData.dueDate ||
          null,

        due_time:
          formData.dueTime ||
          null,

        updated_at:
          new Date().toISOString(),
      };

      /* -----------------------------------------------
         EDIT
      ------------------------------------------------ */

      if (editingTask) {
        const {
          error,
        } = await supabase
          .from("study_tasks")
          .update(payload)
          .eq(
            "id",
            editingTask.id
          )
          .eq(
            "user_id",
            user.id
          );

        if (error) {
          throw error;
        }

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title:
            "تم تعديل المهمة بنجاح",
          showConfirmButton: false,
          timer: 2500,
        });
      }

      /* -----------------------------------------------
         INSERT
      ------------------------------------------------ */

      else {
        const {
          error,
        } = await supabase
          .from("study_tasks")
          .insert({
            ...payload,

            is_completed:
              false,

            completed_at:
              null,
          });

        if (error) {
          throw error;
        }

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title:
            "تمت إضافة المهمة بنجاح",
          showConfirmButton: false,
          timer: 2500,
        });
      }

      /* -----------------------------------------------
         Reload Tasks
      ------------------------------------------------ */

      const tasksData =
        await fetchTasks(
          user
        );

      const mappedTasks =
        mapTasks(
          tasksData,
          subjectsData,
          unitsData,
          lessonsData
        );

      setTasks(
        mappedTasks
      );

      setShowTaskModal(
        false
      );

      setEditingTask(
        null
      );
    } catch (error) {
      console.error(
        "SAVE TASK ERROR:",
        error
      );

      Swal.fire({
        icon: "error",
        title:
          "تعذر حفظ المهمة",
        text:
          error?.message ||
          "حدث خطأ أثناء حفظ المهمة.",
        confirmButtonText:
          "حسنًا",
      });
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     TOGGLE TASK
  ======================================================= */

  const toggleTaskStatus = async (
    task
  ) => {
    if (!user?.id) {
      return;
    }

    const newCompleted =
      !task.is_completed;

    const previousTasks = [
      ...tasks,
    ];

    const completedAt =
      newCompleted
        ? new Date().toISOString()
        : null;

    /* Optimistic UI */

    setTasks(
      (currentTasks) =>
        currentTasks.map(
          (item) =>
            item.id ===
            task.id
              ? {
                  ...item,

                  is_completed:
                    newCompleted,

                  completed_at:
                    completedAt,
                }
              : item
        )
    );

    try {
      const {
        error,
      } = await supabase
        .from("study_tasks")
        .update({
          is_completed:
            newCompleted,

          completed_at:
            completedAt,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          task.id
        )
        .eq(
          "user_id",
          user.id
        );

      if (error) {
        throw error;
      }

      if (newCompleted) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title:
            "تم إكمال المهمة ✓",
          showConfirmButton: false,
          timer: 1800,
        });
      }
    } catch (error) {
      console.error(
        "TOGGLE TASK ERROR:",
        error
      );

      setTasks(
        previousTasks
      );

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title:
          "تعذر تحديث حالة المهمة",
        showConfirmButton: false,
        timer: 2500,
      });
    }
  };

  /* =======================================================
     DELETE TASK
  ======================================================= */

  const deleteTask = async (
    task
  ) => {
    if (!user?.id) {
      return;
    }

    setOpenMenuId(null);

    const result =
      await Swal.fire({
        icon: "warning",
        title:
          "حذف المهمة؟",
        text:
          "سيتم حذف المهمة نهائيًا.",
        showCancelButton: true,
        confirmButtonText:
          "حذف",
        cancelButtonText:
          "إلغاء",
        reverseButtons: true,
      });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const {
        error,
      } = await supabase
        .from("study_tasks")
        .delete()
        .eq(
          "id",
          task.id
        )
        .eq(
          "user_id",
          user.id
        );

      if (error) {
        throw error;
      }

      setTasks(
        (currentTasks) =>
          currentTasks.filter(
            (item) =>
              item.id !==
              task.id
          )
      );

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title:
          "تم حذف المهمة",
        showConfirmButton: false,
        timer: 2200,
      });
    } catch (error) {
      console.error(
        "DELETE TASK ERROR:",
        error
      );

      Swal.fire({
        icon: "error",
        title:
          "تعذر حذف المهمة",
        text:
          error?.message ||
          "حدث خطأ أثناء حذف المهمة.",
        confirmButtonText:
          "حسنًا",
      });
    }
  };

  /* =======================================================
     FILTERED TASKS
  ======================================================= */

  const filteredTasks = useMemo(() => {
    let result = [
      ...tasks,
    ];

    const today =
      getLocalDate();

    /* TAB */

    if (
      activeTab ===
      "مكتملة"
    ) {
      result =
        result.filter(
          (task) =>
            task.is_completed
        );
    }

    if (
      activeTab ===
      "المقبلة"
    ) {
      result =
        result.filter(
          (task) => {
            if (
              task.is_completed
            ) {
              return false;
            }

            if (
              !task.due_date
            ) {
              return true;
            }

            return (
              task.due_date >=
              today
            );
          }
        );
    }

    if (
      activeTab ===
      "متأخرة"
    ) {
      result =
        result.filter(
          (task) =>
            !task.is_completed &&
            task.due_date &&
            task.due_date <
              today
        );
    }

    if (
      activeTab ===
      "مهام اليوم"
    ) {
      result =
        result.filter(
          (task) =>
            task.due_date ===
            today
        );
    }

    /* SUBJECT */

    if (
      selectedSubject !==
      "كل المواد"
    ) {
      result =
        result.filter(
          (task) =>
            task.subjects
              ?.name ===
            selectedSubject
        );
    }

    /* PRIORITY */

    if (
      selectedPriority !==
      "كل الأولويات"
    ) {
      result =
        result.filter(
          (task) =>
            task.priority ===
            selectedPriority
        );
    }

    /* SEARCH */

    if (
      search.trim()
    ) {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      result =
        result.filter(
          (task) => {
            const title =
              task.title?.toLowerCase() ||
              "";

            const subject =
              task.subjects?.name?.toLowerCase() ||
              "";

            const unit =
              task.units?.title?.toLowerCase() ||
              "";

            const lesson =
              task.lessons?.title?.toLowerCase() ||
              "";

            return (
              title.includes(
                searchValue
              ) ||
              subject.includes(
                searchValue
              ) ||
              unit.includes(
                searchValue
              ) ||
              lesson.includes(
                searchValue
              )
            );
          }
        );
    }

    /* SORT */

    if (
      sortBy ===
      "الأحدث"
    ) {
      result.sort(
        (a, b) =>
          new Date(
            b.created_at
          ) -
          new Date(
            a.created_at
          )
      );
    }

    if (
      sortBy ===
      "الأقدم"
    ) {
      result.sort(
        (a, b) =>
          new Date(
            a.created_at
          ) -
          new Date(
            b.created_at
          )
      );
    }

    if (
      sortBy ===
      "الأولوية"
    ) {
      const priorityOrder = {
        high: 1,
        medium: 2,
        low: 3,
      };

      result.sort(
        (a, b) =>
          (
            priorityOrder[
              a.priority
            ] || 4
          ) -
          (
            priorityOrder[
              b.priority
            ] || 4
          )
      );
    }

    return result;
  }, [
    tasks,
    activeTab,
    selectedSubject,
    selectedPriority,
    search,
    sortBy,
  ]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const totalTasks =
    tasks.length;

  const completedTasks =
    tasks.filter(
      (task) =>
        task.is_completed
    ).length;

  const pendingTasks =
    totalTasks -
    completedTasks;

  const today =
    getLocalDate();

  const todayTasks =
    tasks.filter(
      (task) =>
        task.due_date ===
        today
    ).length;

  const overdueTasks =
    tasks.filter(
      (task) =>
        !task.is_completed &&
        task.due_date &&
        task.due_date <
          today
    ).length;

  const upcomingTasks =
    tasks.filter(
      (task) =>
        !task.is_completed &&
        task.due_date &&
        task.due_date >
          today
    ).length;

  const progress =
    totalTasks > 0
      ? Math.round(
          (completedTasks /
            totalTasks) *
            100
        )
      : 0;

  /* =======================================================
     PRIORITY STATISTICS
  ======================================================= */

  const priorityStats =
    useMemo(() => {
      const high =
        tasks.filter(
          (task) =>
            task.priority ===
            "high"
        ).length;

      const medium =
        tasks.filter(
          (task) =>
            task.priority ===
            "medium"
        ).length;

      const low =
        tasks.filter(
          (task) =>
            task.priority ===
            "low"
        ).length;

      const none =
        tasks.filter(
          (task) =>
            !task.priority
        ).length;

      return {
        high,
        medium,
        low,
        none,
      };
    }, [tasks]);

  const priorityTotal =
    priorityStats.high +
    priorityStats.medium +
    priorityStats.low +
    priorityStats.none;

  const highPercentage =
    priorityTotal > 0
      ? Math.round(
          (priorityStats.high /
            priorityTotal) *
            100
        )
      : 0;

  const mediumPercentage =
    priorityTotal > 0
      ? Math.round(
          (priorityStats.medium /
            priorityTotal) *
            100
        )
      : 0;

  const lowPercentage =
    priorityTotal > 0
      ? Math.round(
          (priorityStats.low /
            priorityTotal) *
            100
        )
      : 0;

  const nonePercentage =
    priorityTotal > 0
      ? Math.round(
          (priorityStats.none /
            priorityTotal) *
            100
        )
      : 0;

  /* =======================================================
     FORM UNITS
  ======================================================= */

  const formUnits = useMemo(() => {
    if (!formData.subjectId) {
      return [];
    }

    return unitsData
      .filter(
        (unit) =>
          unit.subject_id ===
          formData.subjectId
      )
      .sort(
        (a, b) =>
          Number(
            a.sort_order || 0
          ) -
          Number(
            b.sort_order || 0
          )
      );
  }, [
    unitsData,
    formData.subjectId,
  ]);

  /* =======================================================
     FORM LESSONS
  ======================================================= */

  const formLessons =
    useMemo(() => {
      if (
        !formData.unitId
      ) {
        return [];
      }

      return lessonsData
        .filter(
          (lesson) =>
            lesson.unit_id ===
            formData.unitId
        )
        .sort(
          (a, b) =>
            Number(
              a.sort_order || 0
            ) -
            Number(
              b.sort_order || 0
            )
        );
    }, [
      lessonsData,
      formData.unitId,
    ]);

  /* =======================================================
     UPCOMING TASKS
  ======================================================= */

  const upcomingTasksList =
    useMemo(() => {
      return [...tasks]
        .filter(
          (task) =>
            !task.is_completed &&
            task.due_date &&
            task.due_date >=
              today
        )
        .sort(
          (a, b) => {
            const dateA =
              `${a.due_date || ""} ${
                a.due_time || ""
              }`;

            const dateB =
              `${b.due_date || ""} ${
                b.due_time || ""
              }`;

            return dateA.localeCompare(
              dateB
            );
          }
        )
        .slice(0, 3);
    }, [
      tasks,
      today,
    ]);

  /* =======================================================
     RESET FILTERS
  ======================================================= */

  const resetFilters = () => {
    setActiveTab(
      "كل المهام"
    );

    setSelectedSubject(
      "كل المواد"
    );

    setSelectedPriority(
      "كل الأولويات"
    );

    setSearch("");

    setSortBy(
      "الأحدث"
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="tasks-page">
      <Header />

      {/* =====================================================
          TOP STATISTICS
      ====================================================== */}

      <section className="tasks-stats">

        <article className="task-stat-card progress-stat">
          <div className="task-stat-content">
            <h3>
              معدل الإنجاز
            </h3>

            <strong>
              {progress}%
            </strong>

            <span>
              من إجمالي المهام
            </span>

            <div className="stat-progress">
              <span
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </article>

        <article className="task-stat-card">
          <div className="task-stat-icon blue">
            <FaCalendarAlt />
          </div>

          <div className="task-stat-content">
            <h3>
              إجمالي المهام
            </h3>

            <strong>
              {totalTasks}
            </strong>

            <span>
              كل المهام
            </span>
          </div>
        </article>

        <article className="task-stat-card">
          <div className="task-stat-icon red">
            <FaExclamationCircle />
          </div>

          <div className="task-stat-content">
            <h3>
              المتأخرة
            </h3>

            <strong>
              {overdueTasks}
            </strong>

            <span>
              تحتاج اهتمامك
            </span>
          </div>
        </article>

        <article className="task-stat-card">
          <div className="task-stat-icon orange">
            <FaClock />
          </div>

          <div className="task-stat-content">
            <h3>
              المقبلة
            </h3>

            <strong>
              {upcomingTasks}
            </strong>

            <span>
              مجدولة لاحقًا
            </span>
          </div>
        </article>

        <article className="task-stat-card">
          <div className="task-stat-icon green">
            <FaCheck />
          </div>

          <div className="task-stat-content">
            <h3>
              المكتملة
            </h3>

            <strong>
              {completedTasks}
            </strong>

            <span>
              مهام
            </span>

            <div className="stat-growth">
              إجمالي المهام المكتملة
            </div>
          </div>
        </article>

      </section>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <section className="tasks-layout">

        <div className="tasks-main">

          {/* Tabs */}

          <div className="tasks-tabs">
            {tabs.map(
              (tab) => (
                <button
                  key={tab}
                  className={
                    activeTab ===
                    tab
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab(
                      tab
                    )
                  }
                  type="button"
                >
                  {tab}

                  {tab ===
                    "مهام اليوم" && (
                    <span className="tab-badge">
                      {todayTasks}
                    </span>
                  )}

                  {tab ===
                    "متأخرة" && (
                    <span className="tab-badge red">
                      {overdueTasks}
                    </span>
                  )}

                  {tab ===
                    "مكتملة" && (
                    <span className="tab-check">
                      <FaCheck />
                    </span>
                  )}
                </button>
              )
            )}
          </div>

          {/* Controls */}

          <div className="tasks-controls">

            <button
              className="task-control filter-control"
              onClick={
                resetFilters
              }
              type="button"
            >
              تصفية
              <FaFilter />
            </button>

            {/* Subject */}

            <div className="select-control">
              <span>
                {
                  selectedSubject
                }
              </span>

              <FaChevronDown />

              <select
                className="global-select"
                value={
                  selectedSubject
                }
                onChange={(
                  event
                ) =>
                  setSelectedSubject(
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="كل المواد">
                  كل المواد
                </option>

                {subjectsData.map(
                  (subject) => (
                    <option
                      key={
                        subject.id
                      }
                      value={
                        subject.name
                      }
                    >
                      {
                        subject.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Priority */}

            <div className="select-control">
              <span>
                {getPriorityLabel(
                  selectedPriority
                ) === "—"
                  ? "كل الأولويات"
                  : getPriorityLabel(
                      selectedPriority
                    )}
              </span>

              <FaChevronDown />

              <select
                className="global-select"
                value={
                  selectedPriority
                }
                onChange={(
                  event
                ) =>
                  setSelectedPriority(
                    event
                      .target
                      .value
                  )
                }
              >
                {priorities.map(
                  (priority) => (
                    <option
                      key={
                        priority.value
                      }
                      value={
                        priority.value
                      }
                    >
                      {
                        priority.label
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Search */}

            <div className="task-search">
              <input
                type="text"
                placeholder="ابحث في المهام..."
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event
                      .target
                      .value
                  )
                }
              />

              <FaSearch />
            </div>

            {/* Sort */}

            <div className="sort-control">
              <span>
                ترتيب:{" "}
                {sortBy}
              </span>

              <FaChevronDown />

              <select
                className="global-select"
                value={sortBy}
                onChange={(
                  event
                ) =>
                  setSortBy(
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="الأحدث">
                  الأحدث
                </option>

                <option value="الأقدم">
                  الأقدم
                </option>

                <option value="الأولوية">
                  الأولوية
                </option>
              </select>
            </div>

          </div>

          {/* Heading */}

          <div className="tasks-list-header">
            <h2>
              قائمة المهام (
              {
                filteredTasks.length
              }
              )
            </h2>
          </div>

          {/* Table */}

          <div className="tasks-table">

            <div className="tasks-table-head">
              <span>
                المهمة
              </span>

              <span>
                المادة
              </span>

              <span>
                الدرس
              </span>

              <span>
                الأولوية
              </span>

              <span>
                المدة
              </span>

              <span>
                النهائية
              </span>

              <span>
                الحالة
              </span>

              <span />
            </div>

            <div className="tasks-table-body">

              {loading ? (
                <div className="tasks-loading">
                  <div className="tasks-loading-spinner" />

                  <span>
                    جاري تحميل المهام...
                  </span>
                </div>
              ) : (
                <>
                  {filteredTasks.map(
                    (task) => {
                      const subjectIcon =
                        getSubjectIcon(
                          task.subjects
                        );

                      const dueLabel =
                        getDueLabel(
                          task.due_date
                        );

                      const isOverdue =
                        !task.is_completed &&
                        task.due_date &&
                        task.due_date <
                          today;

                      return (
                        <article
                          className={`task-row ${
                            task.is_completed
                              ? "is-completed"
                              : ""
                          }`}
                          key={
                            task.id
                          }
                        >

                          {/* Task */}

                          <div className="task-name">
                            <FaEllipsisV className="task-dots" />

                            <div className="task-name-content">
                              <strong>
                                {
                                  task.title
                                }
                              </strong>
                            </div>
                          </div>

                          {/* Subject */}

                          <div className="task-subject">

                            <div
                              className={`task-subject-icon ${subjectIcon.className}`}
                            >
                              {
                                subjectIcon.icon
                              }
                            </div>

                            <span>
                              {task
                                .subjects
                                ?.name ||
                                "بدون مادة"}
                            </span>

                          </div>

                          {/* Lesson */}

                          <div className="task-lesson">
                            <strong>
                              {
                                task
                                  .lessons
                                  ?.title ||
                                "بدون درس"
                              }
                            </strong>

                            <small>
                              {
                                task
                                  .units
                                  ?.title ||
                                "بدون وحدة"
                              }
                            </small>
                          </div>

                          {/* Priority */}

                          <div>
                            {task.priority ? (
                              <span
                                className={`task-priority ${getPriorityClass(
                                  task.priority
                                )}`}
                              >
                                {
                                  getPriorityLabel(
                                    task.priority
                                  )
                                }
                              </span>
                            ) : (
                              <span className="task-priority-none">
                                —
                              </span>
                            )}
                          </div>

                          {/* Duration */}

                          <div className="task-duration">
                            {task.duration_minutes
                              ? `${task.duration_minutes} دقيقة`
                              : "—"}
                          </div>

                          {/* Due */}

                          <div
                            className={`task-due ${
                              dueLabel ===
                              "اليوم"
                                ? "today"
                                : ""
                            } ${
                              isOverdue
                                ? "overdue"
                                : ""
                            }`}
                          >
                            <strong>
                              {
                                dueLabel
                              }
                            </strong>

                            <small>
                              {formatDateForDisplay(
                                task.due_date
                              )}

                              {task.due_time
                                ? ` - ${String(
                                    task.due_time
                                  ).slice(
                                    0,
                                    5
                                  )}`
                                : ""}
                            </small>
                          </div>

                          {/* Status */}

                          <div className="task-status">

                            <button
                              className={
                                task.is_completed
                                  ? "checked"
                                  : ""
                              }
                              onClick={() =>
                                toggleTaskStatus(
                                  task
                                )
                              }
                              aria-label="تغيير حالة المهمة"
                              type="button"
                            >
                              {task.is_completed && (
                                <FaCheck />
                              )}
                            </button>

                          </div>

                          {/* Menu */}

                          <div className="task-menu-wrapper">

                            <button
                              className="task-menu"
                              type="button"
                              onClick={() =>
                                setOpenMenuId(
                                  openMenuId ===
                                    task.id
                                    ? null
                                    : task.id
                                )
                              }
                            >
                              <FaEllipsisV />
                            </button>

                            {openMenuId ===
                              task.id && (
                              <div className="task-actions-menu">

                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditModal(
                                      task
                                    )
                                  }
                                >
                                  <FaEdit />
                                  تعديل
                                </button>

                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() =>
                                    deleteTask(
                                      task
                                    )
                                  }
                                >
                                  <FaTrash />
                                  حذف
                                </button>

                              </div>
                            )}

                          </div>

                        </article>
                      );
                    }
                  )}

                  {filteredTasks.length ===
                    0 && (
                    <div className="empty-tasks">
                      <FaCheck />

                      <strong>
                        لا توجد مهام
                      </strong>

                      <span>
                        لم يتم العثور
                        على مهام
                        مطابقة للبحث
                        أو الفلترة.
                      </span>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>

          {/* Bottom */}

          <div className="tasks-bottom">

            <button
              className="load-more"
              type="button"
              onClick={
                resetFilters
              }
            >
              عرض كل المهام
              <FaArrowDown />
            </button>

            <button
              className="add-task-button"
              type="button"
              onClick={
                openAddModal
              }
            >
              إضافة مهمة جديدة
              <FaPlus />
            </button>

          </div>

        </div>

        {/* ===================================================
            SIDEBAR
        ================================================== */}

        <aside className="tasks-sidebar">

          {/* Overview */}

          <article className="task-overview-card">

            <h2>
              نظرة عامة
            </h2>

            <div className="donut-wrapper">

              <div
                className="donut-chart"
                style={{
                  background: `conic-gradient(
                    #e14c52 0deg ${highPercentage * 3.6}deg,
                    #e8a330 ${highPercentage * 3.6}deg ${(highPercentage + mediumPercentage) * 3.6}deg,
                    #40aa7b ${(highPercentage + mediumPercentage) * 3.6}deg ${(highPercentage + mediumPercentage + lowPercentage) * 3.6}deg,
                    #4c65dc ${(highPercentage + mediumPercentage + lowPercentage) * 3.6}deg 360deg
                  )`,
                }}
              >

                <div className="donut-center">
                  <strong>
                    {progress}%
                  </strong>

                  <span>
                    إنجاز
                  </span>
                </div>

              </div>
            </div>

            <div className="overview-legend">

              <div>
                <span className="legend-dot high" />

                <span>
                  عالية
                </span>

                <strong>
                  {
                    priorityStats.high
                  }
                </strong>
              </div>

              <div>
                <span className="legend-dot medium" />

                <span>
                  متوسطة
                </span>

                <strong>
                  {
                    priorityStats.medium
                  }
                </strong>
              </div>

              <div>
                <span className="legend-dot low" />

                <span>
                  منخفضة
                </span>

                <strong>
                  {
                    priorityStats.low
                  }
                </strong>
              </div>

              <div>
                <span className="legend-dot complete" />

                <span>
                  مكتملة
                </span>

                <strong>
                  {
                    completedTasks
                  }
                </strong>
              </div>

            </div>

          </article>

          {/* Upcoming */}

          <article className="upcoming-card">

            <div className="sidebar-card-heading">

              <h2>
                المواعيد القادمة
              </h2>

              <FaCalendarAlt />

            </div>

            <div className="upcoming-list">

              {upcomingTasksList.length ===
              0 ? (
                <div className="upcoming-empty">
                  لا توجد مواعيد قادمة
                </div>
              ) : (
                upcomingTasksList.map(
                  (task) => {
                    const icon =
                      getSubjectIcon(
                        task.subjects
                      );

                    const label =
                      getDueLabel(
                        task.due_date
                      );

                    return (
                      <div
                        className="upcoming-item"
                        key={
                          task.id
                        }
                      >

                        <div
                          className={`upcoming-icon ${icon.className}`}
                        >
                          {
                            icon.icon
                          }
                        </div>

                        <div className="upcoming-info">

                          <strong>
                            {
                              task.title
                            }
                          </strong>

                          <small>
                            {task
                              .subjects
                              ?.name ||
                              "بدون مادة"}

                            {" - "}

                            {task
                              .lessons
                              ?.title ||
                              task
                                .units
                                ?.title ||
                              "بدون درس"}
                          </small>

                        </div>

                        <div
                          className={`upcoming-date ${
                            label ===
                            "غدًا"
                              ? "tomorrow"
                              : ""
                          }`}
                        >
                          <strong>
                            {label}
                          </strong>

                          <span>
                            {task.due_time
                              ? String(
                                  task.due_time
                                ).slice(
                                  0,
                                  5
                                )
                              : formatDateForDisplay(
                                  task.due_date
                                )}
                          </span>
                        </div>

                      </div>
                    );
                  }
                )
              )}

            </div>

            <button
              className="view-all-button"
              type="button"
              onClick={() =>
                setActiveTab(
                  "المقبلة"
                )
              }
            >
              عرض كل المواعيد
              <FaArrowLeft />
            </button>

          </article>

          {/* Priority */}

          <article className="priority-card">

            <h2>
              توزيع الأولويات
            </h2>

            <div className="priority-bars">

              <div className="priority-bar-row">
                <span>
                  عالية
                </span>

                <div className="priority-track">
                  <span
                    className="high-bar"
                    style={{
                      width: `${highPercentage}%`,
                    }}
                  />
                </div>

                <strong>
                  {highPercentage}%
                </strong>
              </div>

              <div className="priority-bar-row">
                <span>
                  متوسطة
                </span>

                <div className="priority-track">
                  <span
                    className="medium-bar"
                    style={{
                      width: `${mediumPercentage}%`,
                    }}
                  />
                </div>

                <strong>
                  {mediumPercentage}%
                </strong>
              </div>

              <div className="priority-bar-row">
                <span>
                  منخفضة
                </span>

                <div className="priority-track">
                  <span
                    className="low-bar"
                    style={{
                      width: `${lowPercentage}%`,
                    }}
                  />
                </div>

                <strong>
                  {lowPercentage}%
                </strong>
              </div>

              <div className="priority-bar-row">
                <span>
                  لا يوجد
                </span>

                <div className="priority-track">
                  <span
                    className="none-bar"
                    style={{
                      width: `${nonePercentage}%`,
                    }}
                  />
                </div>

                <strong>
                  {nonePercentage}%
                </strong>
              </div>

            </div>

          </article>

        </aside>

      </section>

      {/* =====================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {showTaskModal && (
        <div
          className="task-modal-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeTaskModal();
            }
          }}
        >

          <div className="task-modal">

            <div className="task-modal-header">

              <div>
                <h2>
                  {editingTask
                    ? "تعديل المهمة"
                    : "إضافة مهمة جديدة"}
                </h2>

                <span>
                  أضف تفاصيل المهمة
                  وحدد موعدها
                  وأولويتها
                </span>
              </div>

              <button
                type="button"
                className="task-modal-close"
                onClick={
                  closeTaskModal
                }
              >
                <FaTimes />
              </button>

            </div>

            <form
              className="task-form"
              onSubmit={
                handleSaveTask
              }
            >

              {/* Title */}

              <div className="task-form-group full">
                <label>
                  اسم المهمة
                  <span>*</span>
                </label>

                <input
                  type="text"
                  value={
                    formData.title
                  }
                  onChange={(
                    event
                  ) =>
                    setFormData(
                      (current) => ({
                        ...current,
                        title:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="مثال: حل 30 سؤال فيزياء"
                  required
                />
              </div>

              {/* Subject */}

              <div className="task-form-group">
                <label>
                  المادة
                </label>

                <div className="task-form-select">
                  <select
                    value={
                      formData.subjectId
                    }
                    onChange={(
                      event
                    ) =>
                      handleSubjectChange(
                        event
                          .target
                          .value
                      )
                    }
                  >
                    <option value="">
                      اختر المادة
                    </option>

                    {subjectsData.map(
                      (subject) => (
                        <option
                          key={
                            subject.id
                          }
                          value={
                            subject.id
                          }
                        >
                          {
                            subject.name
                          }
                        </option>
                      )
                    )}
                  </select>

                  <FaChevronDown />
                </div>
              </div>

              {/* Unit */}

              <div className="task-form-group">
                <label>
                  الوحدة
                </label>

                <div className="task-form-select">
                  <select
                    value={
                      formData.unitId
                    }
                    onChange={(
                      event
                    ) =>
                      handleUnitChange(
                        event
                          .target
                          .value
                      )
                    }
                    disabled={
                      !formData.subjectId
                    }
                  >
                    <option value="">
                      اختر الوحدة
                    </option>

                    {formUnits.map(
                      (unit) => (
                        <option
                          key={
                            unit.id
                          }
                          value={
                            unit.id
                          }
                        >
                          {
                            unit.title
                          }
                        </option>
                      )
                    )}
                  </select>

                  <FaChevronDown />
                </div>
              </div>

              {/* Lesson */}

              <div className="task-form-group">
                <label>
                  الدرس
                </label>

                <div className="task-form-select">
                  <select
                    value={
                      formData.lessonId
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          lessonId:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    disabled={
                      !formData.unitId
                    }
                  >
                    <option value="">
                      اختر الدرس
                    </option>

                    {formLessons.map(
                      (lesson) => (
                        <option
                          key={
                            lesson.id
                          }
                          value={
                            lesson.id
                          }
                        >
                          {
                            lesson.title
                          }
                        </option>
                      )
                    )}
                  </select>

                  <FaChevronDown />
                </div>
              </div>

              {/* Priority */}

              <div className="task-form-group">
                <label>
                  الأولوية
                </label>

                <div className="task-form-select">
                  <select
                    value={
                      formData.priority
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          priority:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  >
                    <option value="">
                      بدون أولوية
                    </option>

                    <option value="high">
                      عالية
                    </option>

                    <option value="medium">
                      متوسطة
                    </option>

                    <option value="low">
                      منخفضة
                    </option>
                  </select>

                  <FaChevronDown />
                </div>
              </div>

              {/* Duration */}

              <div className="task-form-group">
                <label>
                  المدة بالدقائق
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    formData.durationMinutes
                  }
                  onChange={(
                    event
                  ) =>
                    setFormData(
                      (current) => ({
                        ...current,
                        durationMinutes:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="مثال: 60"
                />
              </div>

              {/* Date */}

              <div className="task-form-group">
                <label>
                  الموعد النهائي
                </label>

                <input
                  type="date"
                  value={
                    formData.dueDate
                  }
                  onChange={(
                    event
                  ) =>
                    setFormData(
                      (current) => ({
                        ...current,
                        dueDate:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </div>

              {/* Time */}

              <div className="task-form-group">
                <label>
                  الوقت
                </label>

                <input
                  type="time"
                  value={
                    formData.dueTime
                  }
                  onChange={(
                    event
                  ) =>
                    setFormData(
                      (current) => ({
                        ...current,
                        dueTime:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </div>

              {/* Actions */}

              <div className="task-form-actions">

                <button
                  type="button"
                  className="task-form-cancel"
                  onClick={
                    closeTaskModal
                  }
                  disabled={
                    saving
                  }
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="task-form-submit"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "جاري الحفظ..."
                    : editingTask
                    ? "حفظ التعديلات"
                    : "إضافة المهمة"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}
    </main>
  );
};

export default Tasks;