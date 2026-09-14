import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useTheme } from "../../context/ThemeContext";
import Header from "../../components/Header/Header";
import Swal from "sweetalert2";
import {
  FiAlertTriangle,
  FiSearch,
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiCheckCircle,
  FiCircle,
  FiFilter,
  FiX,
  FiBookOpen,
  FiLayers,
  FiFileText,
  FiRefreshCw,
  FiClock,
  FiTrendingUp,
  FiChevronDown,
} from "react-icons/fi";
import "./Errors.css";

const STATUS_OPTIONS = [
  {
    value: "uncorrected",
    label: "غير مُصحح",
  },
  {
    value: "reviewing",
    label: "قيد المراجعة",
  },
  {
    value: "corrected",
    label: "تم التصحيح",
  },
];

const SORT_OPTIONS = [
  {
    value: "latest",
    label: "الأحدث",
  },
  {
    value: "oldest",
    label: "الأقدم",
  },
  {
    value: "repetition",
    label: "الأكثر تكرارًا",
  },
  {
    value: "title",
    label: "العنوان",
  },
];

const emptyForm = {
  title: "",
  description: "",
  category: "",
  status: "uncorrected",
  solution: "",
  subject_id: "",
  unit_id: "",
  lesson_id: "",
};

const trackLabels = {
  science: "علمي علوم",
  math: "علمي رياضة",
  literary: "أدبي",
  medicine_life: "الطب وعلوم الحياة",
  engineering_cs: "الهندسة وعلوم الحاسب",
  business: "إدارة الأعمال",
  arts: "الآداب والفنون",
};

const getDisplayName = (item, fallback = "بدون اسم") => {
  if (!item) return fallback;

  return (
    item.name ||
    item.title ||
    item.subject_name ||
    item.unit_name ||
    item.lesson_name ||
    fallback
  );
};

const formatDate = (date) => {
  if (!date) return "غير محدد";

  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

const getStatusLabel = (status, isCorrected) => {
  if (isCorrected || status === "corrected") {
    return "تم التصحيح";
  }

  if (status === "reviewing") {
    return "قيد المراجعة";
  }

  return "غير مُصحح";
};

const getStatusClass = (status, isCorrected) => {
  if (isCorrected || status === "corrected") {
    return "corrected";
  }

  if (status === "reviewing") {
    return "reviewing";
  }

  return "uncorrected";
};

export default function Errors() {
  const { darkMode } = useTheme();

  const [user, setUser] = useState(null);
  const [errors, setErrors] = useState([]);

  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [lessons, setLessons] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingError, setEditingError] = useState(null);

  const [form, setForm] = useState(emptyForm);

  // =========================================================
  // Toast
  // =========================================================

  const showToast = useCallback((icon, title) => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title,
      showConfirmButton: false,
      timer: 2800,
      timerProgressBar: true,
    });
  }, []);

  // =========================================================
  // Get current user
  // =========================================================

  const getCurrentUser = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("get user error:", error);
      return null;
    }

    return user;
  }, []);

  // =========================================================
  // Fetch subjects according to student's curriculum
  // =========================================================

  const fetchSubjects = useCallback(async () => {
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!currentUser) {
      throw new Error("يجب تسجيل الدخول أولاً");
    }

    // -------------------------------------------------------
    // Student profile
    // -------------------------------------------------------

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
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profileData) {
      throw new Error("لم يتم العثور على بيانات الطالب");
    }

    const gradeLevel = profileData.grade_level?.trim();
    const educationSystem =
      profileData.education_system?.trim();
    const track = profileData.track?.trim();

    if (!gradeLevel) {
      throw new Error("لم يتم تحديد الصف الدراسي");
    }

    // =======================================================
    // First / Second Secondary
    // =======================================================

    if (
      gradeLevel === "first_secondary" ||
      gradeLevel === "second_secondary"
    ) {
      if (!educationSystem) {
        throw new Error("لم يتم تحديد نظام التعليم");
      }

      let query = supabase
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
            type,
            icon,
            icon_class,
            is_active,
            slug
          )
        `)
        .eq("grade_level", gradeLevel)
        .eq("education_system", educationSystem);

      if (track) {
        query = query.or(
          `track.eq.${track},track.is.null`
        );
      } else {
        query = query.is("track", null);
      }

      const {
        data: accessData,
        error: accessError,
      } = await query;

      if (accessError) throw accessError;

      const subjectsMap = new Map();

      (accessData || []).forEach((item) => {
        const subject = item.subjects;

        if (!subject || !subject.is_active) return;

        subjectsMap.set(subject.id, subject);
      });

      return Array.from(subjectsMap.values()).sort(
        (a, b) =>
          String(a.name || "").localeCompare(
            String(b.name || ""),
            "ar"
          )
      );
    }

    // =======================================================
    // Third Secondary
    // =======================================================

    if (gradeLevel === "third_secondary") {
      const studentSection =
        profileData.section?.trim();

      if (!studentSection) {
        throw new Error("لم يتم تحديد شعبة الطالب");
      }

      const {
        data: sectionData,
        error: sectionError,
      } = await supabase
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

      return Array.from(subjectsMap.values()).sort(
        (a, b) =>
          String(a.name || "").localeCompare(
            String(b.name || ""),
            "ar"
          )
      );
    }

    throw new Error("نوع الصف الدراسي غير مدعوم.");
  }, []);

  // =========================================================
  // Fetch NEW curriculum units
  // =========================================================

  const fetchUnits = useCallback(async (subjectIds = []) => {
    if (!subjectIds.length) return [];

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
      .in("subject_id", subjectIds)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      });

    if (error) throw error;

    return data || [];
  }, []);

  // =========================================================
  // Fetch NEW curriculum lessons
  // =========================================================

  const fetchLessons = useCallback(async (unitIds = []) => {
    if (!unitIds.length) return [];

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
      .in("unit_id", unitIds)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      });

    if (error) throw error;

    return data || [];
  }, []);

  // =========================================================
  // Fetch all page data
  // =========================================================

  const fetchData = useCallback(
    async (currentUser) => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // ---------------------------------------------------
        // 1. Errors
        // ---------------------------------------------------

        const {
          data: errorsData,
          error: errorsError,
        } = await supabase
          .from("study_errors")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("last_occurred_at", {
            ascending: false,
          });

        if (errorsError) {
          console.error(
            "❌ study_errors error:",
            errorsError
          );

          throw errorsError;
        }

        // ---------------------------------------------------
        // 2. Subjects according to student's curriculum
        // ---------------------------------------------------

        const subjectsData = await fetchSubjects();

        // ---------------------------------------------------
        // 3. New units
        // ---------------------------------------------------

        const subjectIds = subjectsData.map(
          (subject) => subject.id
        );

        const unitsData =
          await fetchUnits(subjectIds);

        // ---------------------------------------------------
        // 4. New lessons
        // ---------------------------------------------------

        const unitIds = unitsData.map(
          (unit) => unit.id
        );

        const lessonsData =
          await fetchLessons(unitIds);

        // ---------------------------------------------------
        // 5. Set state
        // ---------------------------------------------------

        setErrors(errorsData || []);
        setSubjects(subjectsData || []);
        setUnits(unitsData || []);
        setLessons(lessonsData || []);
      } catch (error) {
        console.error(
          "❌ fetch Errors page error:",
          error
        );

        showToast(
          "error",
          error?.message ||
            "حدث خطأ أثناء تحميل الأخطاء"
        );
      } finally {
        setLoading(false);
      }
    },
    [
      fetchSubjects,
      fetchUnits,
      fetchLessons,
      showToast,
    ]
  );

  // =========================================================
  // Initial load
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const currentUser =
        await getCurrentUser();

      if (!mounted) return;

      if (!currentUser) {
        setLoading(false);
        return;
      }

      setUser(currentUser);

      await fetchData(currentUser);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [getCurrentUser, fetchData]);

  // =========================================================
  // Realtime
  // =========================================================

  useEffect(() => {
    if (!user?.id) return;

    const channelName =
      `study-errors-${user.id}`;

    const channel =
      supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "study_errors",
        filter: `user_id=eq.${user.id}`,
      },
      () => {
        fetchData(user);
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  // =========================================================
  // Maps
  // =========================================================

  const subjectMap = useMemo(() => {
    const map = {};

    subjects.forEach((subject) => {
      map[subject.id] = subject;
    });

    return map;
  }, [subjects]);

  const unitMap = useMemo(() => {
    const map = {};

    units.forEach((unit) => {
      map[unit.id] = unit;
    });

    return map;
  }, [units]);

  const lessonMap = useMemo(() => {
    const map = {};

    lessons.forEach((lesson) => {
      map[lesson.id] = lesson;
    });

    return map;
  }, [lessons]);

  // =========================================================
  // Categories
  // =========================================================

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        errors
          .map((error) => error.category)
          .filter(Boolean)
      )
    ).sort((a, b) =>
      a.localeCompare(b, "ar")
    );
  }, [errors]);

  // =========================================================
  // Form Units
  // =========================================================

  const formUnits = useMemo(() => {
    if (!form.subject_id) return [];

    return units.filter(
      (unit) =>
        unit.subject_id === form.subject_id
    );
  }, [units, form.subject_id]);

  // =========================================================
  // Form Lessons
  // =========================================================

  const formLessons = useMemo(() => {
    if (!form.unit_id) return [];

    return lessons.filter(
      (lesson) =>
        lesson.unit_id === form.unit_id
    );
  }, [lessons, form.unit_id]);

  // =========================================================
  // Statistics
  // =========================================================

  const stats = useMemo(() => {
    const total = errors.length;

    const corrected = errors.filter(
      (error) =>
        error.is_corrected ||
        error.status === "corrected"
    ).length;

    const reviewing = errors.filter(
      (error) =>
        !error.is_corrected &&
        error.status === "reviewing"
    ).length;

    const uncorrected = errors.filter(
      (error) =>
        !error.is_corrected &&
        error.status !== "corrected" &&
        error.status !== "reviewing"
    ).length;

    const repeated = errors.filter(
      (error) =>
        Number(
          error.repetition_count || 0
        ) > 1
    ).length;

    const totalRepetitions =
      errors.reduce(
        (sum, error) =>
          sum +
          Number(
            error.repetition_count || 0
          ),
        0
      );

    return {
      total,
      corrected,
      reviewing,
      uncorrected,
      repeated,
      totalRepetitions,
    };
  }, [errors]);

  // =========================================================
  // Filtering
  // =========================================================

  const filteredErrors = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    const result = errors.filter((error) => {
      const subject =
        subjectMap[error.subject_id];

      const unit =
        unitMap[error.unit_id];

      const lesson =
        lessonMap[error.lesson_id];

      const subjectName =
        getDisplayName(subject, "");

      const unitName =
        getDisplayName(unit, "");

      const lessonName =
        getDisplayName(lesson, "");

      const searchText = [
        error.title,
        error.description,
        error.category,
        error.solution,
        subjectName,
        unitName,
        lessonName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchText.includes(
          normalizedSearch
        );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "corrected" &&
          (error.is_corrected ||
            error.status === "corrected")) ||
        (statusFilter === "reviewing" &&
          !error.is_corrected &&
          error.status === "reviewing") ||
        (statusFilter === "uncorrected" &&
          !error.is_corrected &&
          error.status !== "corrected" &&
          error.status !== "reviewing");

      const matchesSubject =
        subjectFilter === "all" ||
        error.subject_id === subjectFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        error.category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSubject &&
        matchesCategory
      );
    });

    return result.sort((a, b) => {
      if (sortBy === "oldest") {
        return (
          new Date(a.last_occurred_at) -
          new Date(b.last_occurred_at)
        );
      }

      if (sortBy === "repetition") {
        return (
          Number(b.repetition_count || 0) -
          Number(a.repetition_count || 0)
        );
      }

      if (sortBy === "title") {
        return (
          (a.title || "").localeCompare(
            b.title || "",
            "ar"
          )
        );
      }

      return (
        new Date(b.last_occurred_at) -
        new Date(a.last_occurred_at)
      );
    });
  }, [
    errors,
    search,
    statusFilter,
    subjectFilter,
    categoryFilter,
    sortBy,
    subjectMap,
    unitMap,
    lessonMap,
  ]);

  // =========================================================
  // Form handlers
  // =========================================================

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (name === "subject_id") {
        next.unit_id = "";
        next.lesson_id = "";
      }

      if (name === "unit_id") {
        next.lesson_id = "";
      }

      return next;
    });
  };

  // =========================================================
  // Open add modal
  // =========================================================

  const openAddModal = () => {
    setEditingError(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  // =========================================================
  // Open edit modal
  // =========================================================

  const openEditModal = (error) => {
    setEditingError(error);

    setForm({
      title: error.title || "",
      description: error.description || "",
      category: error.category || "",
      status: error.is_corrected
        ? "corrected"
        : error.status || "uncorrected",
      solution: error.solution || "",
      subject_id: error.subject_id || "",
      unit_id: error.unit_id || "",
      lesson_id: error.lesson_id || "",
    });

    setShowModal(true);
  };

  // =========================================================
  // Close modal
  // =========================================================

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingError(null);
    setForm(emptyForm);
  };

  // =========================================================
  // Save
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      showToast(
        "error",
        "لم يتم العثور على المستخدم"
      );
      return;
    }

    if (!form.title.trim()) {
      showToast(
        "warning",
        "اكتب عنوان الخطأ"
      );
      return;
    }

    if (!form.description.trim()) {
      showToast(
        "warning",
        "اكتب وصف الخطأ"
      );
      return;
    }

    try {
      setSaving(true);

      if (editingError) {
        const isCorrected =
          form.status === "corrected";

        const updateData = {
          title: form.title.trim(),

          description:
            form.description.trim(),

          category:
            form.category.trim() || null,

          status: form.status,

          is_corrected: isCorrected,

          solution:
            form.solution.trim() || null,

          // New curriculum IDs
          subject_id:
            form.subject_id || null,

          unit_id:
            form.unit_id || null,

          lesson_id:
            form.lesson_id || null,

          last_reviewed_at:
            form.status !== "uncorrected"
              ? new Date().toISOString()
              : editingError.last_reviewed_at,
        };

        const { error } =
          await supabase
            .from("study_errors")
            .update(updateData)
            .eq("id", editingError.id)
            .eq("user_id", user.id);

        if (error) throw error;

        showToast(
          "success",
          "تم تعديل الخطأ بنجاح"
        );
      } else {
        const { error } =
          await supabase
            .from("study_errors")
            .insert({
              user_id: user.id,

              // New curriculum IDs
              subject_id:
                form.subject_id || null,

              unit_id:
                form.unit_id || null,

              lesson_id:
                form.lesson_id || null,

              title:
                form.title.trim(),

              description:
                form.description.trim(),

              category:
                form.category.trim() || null,

              status:
                form.status,

              repetition_count: 1,

              is_corrected:
                form.status ===
                "corrected",

              solution:
                form.solution.trim() ||
                null,

              last_occurred_at:
                new Date().toISOString(),

              last_reviewed_at:
                form.status !==
                "uncorrected"
                  ? new Date().toISOString()
                  : null,
            });

        if (error) throw error;

        showToast(
          "success",
          "تمت إضافة الخطأ بنجاح"
        );
      }

      closeModal();

      await fetchData(user);
    } catch (error) {
      console.error(
        "save error:",
        error
      );

      showToast(
        "error",
        error?.message ||
          "حدث خطأ أثناء حفظ البيانات"
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // Delete
  // =========================================================

  const handleDelete = async (errorItem) => {
    const result = await Swal.fire({
      title: "حذف الخطأ؟",
      text: "سيتم حذف هذا الخطأ نهائيًا.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "نعم، احذف",
      cancelButtonText: "إلغاء",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const { error } =
        await supabase
          .from("study_errors")
          .delete()
          .eq("id", errorItem.id)
          .eq("user_id", user.id);

      if (error) throw error;

      showToast(
        "success",
        "تم حذف الخطأ"
      );

      await fetchData(user);
    } catch (error) {
      console.error(
        "delete error:",
        error
      );

      showToast(
        "error",
        "حدث خطأ أثناء حذف الخطأ"
      );
    }
  };

  // =========================================================
  // Correct / uncorrect
  // =========================================================

  const toggleCorrected = async (errorItem) => {
    const currentlyCorrected =
      errorItem.is_corrected ||
      errorItem.status === "corrected";

    try {
      const nextCorrected =
        !currentlyCorrected;

      const { error } =
        await supabase
          .from("study_errors")
          .update({
            is_corrected: nextCorrected,

            status: nextCorrected
              ? "corrected"
              : "uncorrected",

            last_reviewed_at:
              new Date().toISOString(),
          })
          .eq("id", errorItem.id)
          .eq("user_id", user.id);

      if (error) throw error;

      showToast(
        "success",
        nextCorrected
          ? "تم تسجيل الخطأ كمُصحح"
          : "تم إعادة الخطأ للمراجعة"
      );

      await fetchData(user);
    } catch (error) {
      console.error(
        "toggle corrected error:",
        error
      );

      showToast(
        "error",
        "حدث خطأ أثناء تحديث حالة الخطأ"
      );
    }
  };

  // =========================================================
  // Repeat error
  // =========================================================

  const repeatError = async (errorItem) => {
    try {
      const nextCount =
        Number(
          errorItem.repetition_count || 0
        ) + 1;

      const { error } =
        await supabase
          .from("study_errors")
          .update({
            repetition_count: nextCount,

            last_occurred_at:
              new Date().toISOString(),

            is_corrected: false,

            status: "uncorrected",
          })
          .eq("id", errorItem.id)
          .eq("user_id", user.id);

      if (error) throw error;

      showToast(
        "success",
        "تم تسجيل تكرار الخطأ"
      );

      await fetchData(user);
    } catch (error) {
      console.error(
        "repeat error:",
        error
      );

      showToast(
        "error",
        "حدث خطأ أثناء تسجيل التكرار"
      );
    }
  };

  // =========================================================
  // Clear filters
  // =========================================================

  const clearFilters = () => {
    setStatusFilter("all");
    setSubjectFilter("all");
    setCategoryFilter("all");
    setSortBy("latest");
    setSearch("");
  };

  const hasActiveFilters =
    search ||
    statusFilter !== "all" ||
    subjectFilter !== "all" ||
    categoryFilter !== "all" ||
    sortBy !== "latest";

  // =========================================================
  // Render
  // =========================================================

  return (
    <div
      className={`errors-page ${
        darkMode ? "dark-mode" : ""
      }`}
      dir="rtl"
    >
      <Header />

      <main className="errors-container">

        <section className="errors-hero">
          <div className="errors-hero-content">
            <div className="errors-title-row">
              <div className="errors-title-icon">
                <FiAlertTriangle />
              </div>

              <div>
                <h1>متابعة الأخطاء</h1>

                <p>
                  سجل أخطائك، افهمها، وصححها
                  لتتجنب تكرارها مرة أخرى
                </p>
              </div>
            </div>

            <button
              className="add-error-btn"
              onClick={openAddModal}
            >
              <FiPlus />
              <span>إضافة خطأ</span>
            </button>
          </div>
        </section>

        <section className="errors-stats">

          <div className="error-stat-card">
            <div className="stat-icon total">
              <FiAlertTriangle />
            </div>

            <div className="stat-info">
              <span>إجمالي الأخطاء</span>
              <strong>{stats.total}</strong>
            </div>
          </div>

          <div className="error-stat-card">
            <div className="stat-icon uncorrected">
              <FiCircle />
            </div>

            <div className="stat-info">
              <span>غير مُصححة</span>
              <strong>{stats.uncorrected}</strong>
            </div>
          </div>

          <div className="error-stat-card">
            <div className="stat-icon reviewing">
              <FiRefreshCw />
            </div>

            <div className="stat-info">
              <span>قيد المراجعة</span>
              <strong>{stats.reviewing}</strong>
            </div>
          </div>

          <div className="error-stat-card">
            <div className="stat-icon corrected">
              <FiCheckCircle />
            </div>

            <div className="stat-info">
              <span>تم تصحيحها</span>
              <strong>{stats.corrected}</strong>
            </div>
          </div>

          <div className="error-stat-card">
            <div className="stat-icon repeated">
              <FiTrendingUp />
            </div>

            <div className="stat-info">
              <span>أخطاء متكررة</span>
              <strong>{stats.repeated}</strong>
            </div>
          </div>

        </section>

        <section className="errors-toolbar">

          <div className="errors-search">
            <FiSearch />

            <input
              type="text"
              placeholder="ابحث في الأخطاء..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            {search && (
              <button
                type="button"
                className="clear-search"
                onClick={() =>
                  setSearch("")
                }
              >
                <FiX />
              </button>
            )}
          </div>

          <button
            type="button"
            className={`filter-toggle ${
              showFilters ? "active" : ""
            }`}
            onClick={() =>
              setShowFilters(
                (prev) => !prev
              )
            }
          >
            <FiFilter />

            <span>الفلاتر</span>

            <FiChevronDown />
          </button>

        </section>

        {showFilters && (
          <section className="filters-panel">

            <div className="filter-item">
              <label>الحالة</label>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
              >
                <option value="all">
                  كل الحالات
                </option>

                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="filter-item">
              <label>المادة</label>

              <select
                value={subjectFilter}
                onChange={(e) =>
                  setSubjectFilter(
                    e.target.value
                  )
                }
              >
                <option value="all">
                  كل المواد
                </option>

                {subjects.map(
                  (subject) => (
                    <option
                      key={subject.id}
                      value={subject.id}
                    >
                      {getDisplayName(
                        subject,
                        "بدون اسم"
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="filter-item">
              <label>التصنيف</label>

              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(
                    e.target.value
                  )
                }
              >
                <option value="all">
                  كل التصنيفات
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="filter-item">
              <label>ترتيب حسب</label>

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value
                  )
                }
              >
                {SORT_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="clear-filters-btn"
                onClick={clearFilters}
              >
                <FiX />
                مسح الفلاتر
              </button>
            )}

          </section>
        )}

        <div className="errors-results-info">

          <div>
            <strong>
              {filteredErrors.length}
            </strong>

            <span>
              خطأ
              {filteredErrors.length !== 1
                ? " "
                : ""}
            </span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
            >
              إعادة ضبط
            </button>
          )}

        </div>

        {loading ? (
          <section className="errors-loading">
            <div className="loading-spinner" />

            <p>
              جاري تحميل الأخطاء...
            </p>
          </section>
        ) : filteredErrors.length === 0 ? (
          <section className="errors-empty">

            <div className="empty-icon">
              <FiCheckCircle />
            </div>

            <h2>
              {errors.length === 0
                ? "مفيش أخطاء مسجلة"
                : "مفيش نتائج مطابقة"}
            </h2>

            <p>
              {errors.length === 0
                ? "ابدأ بتسجيل أول خطأ علشان تقدر تراجعه وتتعلم منه."
                : "جرب تغيير البحث أو الفلاتر للوصول للنتيجة المطلوبة."}
            </p>

            {errors.length === 0 && (
              <button
                type="button"
                onClick={openAddModal}
              >
                <FiPlus />
                إضافة أول خطأ
              </button>
            )}

          </section>
        ) : (
          <section className="errors-list">

            {filteredErrors.map(
              (errorItem) => {
                const subject =
                  subjectMap[
                    errorItem.subject_id
                  ];

                const unit =
                  unitMap[
                    errorItem.unit_id
                  ];

                const lesson =
                  lessonMap[
                    errorItem.lesson_id
                  ];

                const corrected =
                  errorItem.is_corrected ||
                  errorItem.status ===
                    "corrected";

                const statusClass =
                  getStatusClass(
                    errorItem.status,
                    errorItem.is_corrected
                  );

                return (
                  <article
                    className={`error-card ${statusClass}`}
                    key={errorItem.id}
                  >
                    <div className="error-card-main">

                      <div className="error-card-top">

                        <div className="error-heading">

                          <div
                            className={`error-status-dot ${statusClass}`}
                          />

                          <div>
                            <h3>
                              {errorItem.title}
                            </h3>

                            <span
                              className={`error-status ${statusClass}`}
                            >
                              {getStatusLabel(
                                errorItem.status,
                                errorItem.is_corrected
                              )}
                            </span>
                          </div>

                        </div>

                        <div className="error-actions">

                          <button
                            type="button"
                            title={
                              corrected
                                ? "إعادة للمراجعة"
                                : "تحديد كمصحح"
                            }
                            className={`icon-action ${
                              corrected
                                ? "undo"
                                : "success"
                            }`}
                            onClick={() =>
                              toggleCorrected(
                                errorItem
                              )
                            }
                          >
                            {corrected ? (
                              <FiRefreshCw />
                            ) : (
                              <FiCheckCircle />
                            )}
                          </button>

                          <button
                            type="button"
                            title="تعديل"
                            className="icon-action edit"
                            onClick={() =>
                              openEditModal(
                                errorItem
                              )
                            }
                          >
                            <FiEdit3 />
                          </button>

                          <button
                            type="button"
                            title="حذف"
                            className="icon-action delete"
                            onClick={() =>
                              handleDelete(
                                errorItem
                              )
                            }
                          >
                            <FiTrash2 />
                          </button>

                        </div>
                      </div>

                      <p className="error-description">
                        {errorItem.description}
                      </p>

                      <div className="error-meta">

                        {subject && (
                          <span>
                            <FiBookOpen />
                            {getDisplayName(
                              subject
                            )}
                          </span>
                        )}

                        {unit && (
                          <span>
                            <FiLayers />
                            {getDisplayName(
                              unit
                            )}
                          </span>
                        )}

                        {lesson && (
                          <span>
                            <FiFileText />
                            {getDisplayName(
                              lesson
                            )}
                          </span>
                        )}

                        {errorItem.category && (
                          <span className="category-tag">
                            {errorItem.category}
                          </span>
                        )}

                      </div>

                      <div className="error-footer">

                        <div className="error-date">
                          <FiClock />

                          <span>
                            آخر حدوث:{" "}
                            {formatDate(
                              errorItem.last_occurred_at
                            )}
                          </span>
                        </div>

                        {errorItem.last_reviewed_at && (
                          <div className="error-date">
                            <FiRefreshCw />

                            <span>
                              آخر مراجعة:{" "}
                              {formatDate(
                                errorItem.last_reviewed_at
                              )}
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          className="repeat-btn"
                          onClick={() =>
                            repeatError(
                              errorItem
                            )
                          }
                        >
                          <FiRefreshCw />

                          تكرر الخطأ

                          <strong>
                            {Number(
                              errorItem.repetition_count ||
                                0
                            )}
                          </strong>
                        </button>

                      </div>

                      {errorItem.solution && (
                        <div className="solution-box">

                          <div className="solution-title">
                            <FiCheckCircle />

                            الحل / طريقة التصحيح
                          </div>

                          <p>
                            {errorItem.solution}
                          </p>

                        </div>
                      )}

                    </div>
                  </article>
                );
              }
            )}

          </section>
        )}

      </main>

      {showModal && (
        <div
          className="error-modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="error-modal">

            <div className="modal-header">

              <div>

                <div className="modal-title-icon">
                  <FiAlertTriangle />
                </div>

                <div>
                  <h2>
                    {editingError
                      ? "تعديل الخطأ"
                      : "إضافة خطأ جديد"}
                  </h2>

                  <p>
                    سجل الخطأ بالتفصيل علشان
                    تستفيد منه في المراجعة
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={closeModal}
                className="modal-close"
              >
                <FiX />
              </button>

            </div>

            <form
              className="error-form"
              onSubmit={handleSubmit}
            >

              <div className="form-group full">

                <label>
                  عنوان الخطأ
                  <span>*</span>
                </label>

                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="مثال: خطأ في قانون نيوتن الثاني"
                  autoFocus
                />

              </div>

              <div className="form-group full">

                <label>
                  وصف الخطأ
                  <span>*</span>
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="اكتب إيه اللي غلطت فيه بالضبط..."
                  rows={4}
                />

              </div>

              <div className="form-grid">

                <div className="form-group">

                  <label>
                    المادة
                  </label>

                  <select
                    name="subject_id"
                    value={form.subject_id}
                    onChange={handleFormChange}
                  >
                    <option value="">
                      اختر المادة
                    </option>

                    {subjects.map(
                      (subject) => (
                        <option
                          key={subject.id}
                          value={subject.id}
                        >
                          {getDisplayName(
                            subject
                          )}
                        </option>
                      )
                    )}
                  </select>

                </div>

                <div className="form-group">

                  <label>
                    الوحدة
                  </label>

                  <select
                    name="unit_id"
                    value={form.unit_id}
                    onChange={handleFormChange}
                    disabled={!form.subject_id}
                  >
                    <option value="">
                      اختر الوحدة
                    </option>

                    {formUnits.map(
                      (unit) => (
                        <option
                          key={unit.id}
                          value={unit.id}
                        >
                          {getDisplayName(
                            unit
                          )}
                        </option>
                      )
                    )}
                  </select>

                </div>

                <div className="form-group">

                  <label>
                    الدرس
                  </label>

                  <select
                    name="lesson_id"
                    value={form.lesson_id}
                    onChange={handleFormChange}
                    disabled={!form.unit_id}
                  >
                    <option value="">
                      اختر الدرس
                    </option>

                    {formLessons.map(
                      (lesson) => (
                        <option
                          key={lesson.id}
                          value={lesson.id}
                        >
                          {getDisplayName(
                            lesson
                          )}
                        </option>
                      )
                    )}
                  </select>

                </div>

                <div className="form-group">

                  <label>
                    التصنيف
                  </label>

                  <input
                    type="text"
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    placeholder="مثال: قانون، مفهوم، حساب..."
                    list="error-categories"
                  />

                  <datalist id="error-categories">
                    {categories.map(
                      (category) => (
                        <option
                          key={category}
                          value={category}
                        />
                      )
                    )}
                  </datalist>

                </div>

              </div>

              <div className="form-group full">

                <label>
                  الحالة
                </label>

                <div className="status-selector">

                  {STATUS_OPTIONS.map(
                    (option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={
                          form.status ===
                          option.value
                            ? `selected ${option.value}`
                            : ""
                        }
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            status:
                              option.value,
                          }))
                        }
                      >
                        {option.value ===
                          "corrected" && (
                          <FiCheckCircle />
                        )}

                        {option.value ===
                          "reviewing" && (
                          <FiRefreshCw />
                        )}

                        {option.value ===
                          "uncorrected" && (
                          <FiCircle />
                        )}

                        {option.label}
                      </button>
                    )
                  )}

                </div>

              </div>

              <div className="form-group full">

                <label>
                  الحل / طريقة التصحيح
                </label>

                <textarea
                  name="solution"
                  value={form.solution}
                  onChange={handleFormChange}
                  placeholder="اكتب الحل الصحيح أو الطريقة اللي تساعدك تتجنب الخطأ..."
                  rows={4}
                />

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="save-btn"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="button-spinner" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle />

                      {editingError
                        ? "حفظ التعديلات"
                        : "إضافة الخطأ"}
                    </>
                  )}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}