import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaFilter,
  FaSortAmountDown,
  FaFolder,
  FaEllipsisV,
  FaCheckCircle,
  FaClock,
  FaPlus,
  FaBook,
  FaFlask,
  FaAtom,
  FaCalculator,
  FaLanguage,
  FaLeaf,
  FaGlobe,
  FaFileAlt,
  FaChevronDown,
  FaChartPie,
  FaEdit,
  FaTrash,
  FaThumbtack,
  FaTimes,
  FaSave,
  FaStickyNote,
} from "react-icons/fa";
import Swal from "sweetalert2";
import Header from "../../components/Header/Header";
import { supabase } from "../../utils/supabaseClient";
import "./Notes.css";
const Notes = () => {
  /* =========================
     STATE
  ========================= */
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStatus, setActiveStatus] = useState("all");
  const [activeSubject, setActiveSubject] = useState("all");
  const [activeFolder, setActiveFolder] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showSubjectFilter, setShowSubjectFilter] = useState(false);
  const [showFolderFilter, setShowFolderFilter] = useState(false);
  const [showSortFilter, setShowSortFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    subject_id: "",
    unit_id: "",
    lesson_id: "",
    folder: "",
    status: "new",
    is_pinned: false,
    note_date: new Date().toISOString().split("T")[0],
  });
  /* =========================
     ICONS
  ========================= */
  const getSubjectIcon = (subjectName = "") => {
    const name = subjectName.toLowerCase();
    if (name.includes("فيزياء") || name.includes("physics")) {
      return <FaAtom />;
    }
    if (name.includes("رياض") || name.includes("math")) {
      return <FaCalculator />;
    }
    if (name.includes("كيمي") || name.includes("chem")) {
      return <FaFlask />;
    }
    if (name.includes("عرب") || name.includes("arabic")) {
      return <FaBook />;
    }
    if (name.includes("إنجليزي") || name.includes("انجليزي")) {
      return <FaLanguage />;
    }
    if (name.includes("أحياء") || name.includes("احياء")) {
      return <FaLeaf />;
    }
    if (name.includes("تاريخ")) {
      return <FaGlobe />;
    }
    return <FaFileAlt />;
  };
  const getSubjectIconType = (subjectName = "") => {
    if (subjectName.includes("فيزياء")) return "physics";
    if (subjectName.includes("رياض")) return "math";
    if (subjectName.includes("كيمي")) return "chemistry";
    if (subjectName.includes("عرب")) return "arabic";
    if (subjectName.includes("إنجليزي") || subjectName.includes("انجليزي")) return "english";
    if (subjectName.includes("أحياء") || subjectName.includes("احياء")) return "biology";
    if (subjectName.includes("تاريخ")) return "history";
    return "general";
  };
  /* =========================
     HELPERS
  ========================= */
  const showSuccess = (title) => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title,
      showConfirmButton: false,
      timer: 2500,
    });
  };
  const showError = (title) => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "error",
      title,
      showConfirmButton: false,
      timer: 3000,
    });
  };
  const getStatusLabel = (status) => {
    switch (status) {
      case "reviewed":
        return "تمت المراجعة";
      case "reviewing":
        return "قيد المراجعة";
      case "new":
        return "جديدة";
      case "uncategorized":
        return "غير مصنفة";
      default:
        return "جديدة";
    }
  };
  const getStatusIcon = (status) => {
    switch (status) {
      case "reviewed":
        return <FaCheckCircle />;
      case "reviewing":
        return <FaClock />;
      case "new":
        return <span className="status-dot" />;
      case "uncategorized":
        return <span className="status-circle" />;
      default:
        return <span className="status-dot" />;
    }
  };
  const formatRelativeTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 1) return "منذ لحظات";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days === 1) return "منذ يوم واحد";
    if (days < 7) return `منذ ${days} أيام`;
    return date.toLocaleDateString("ar-EG");
  };
  /* =========================
     GET USER
  ========================= */
  const getCurrentUser = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      console.error(error);
      return null;
    }
    return user;
  }, []);
  /* =========================
     FETCH DATA
  ========================= */
  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // =========================
      // NOTES
      // =========================
      const { data: notesData, error: notesError } = await supabase
        .from("study_notes")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (notesError) {
        console.error("Notes error:", notesError);
        throw notesError;
      }

      // =========================
      // STUDENT PROFILE
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

      if (profileError) {
        console.error("Profile error:", profileError);
        throw profileError;
      }

      if (!profileData) {
        throw new Error("لم يتم العثور على بيانات الطالب");
      }

      const studentSection = profileData.section?.trim();

      if (!studentSection) {
        throw new Error("لم يتم تحديد شعبة الطالب");
      }

      // =========================
      // SECTION
      // =========================
      const { data: sectionData, error: sectionError } = await supabase
        .from("sections")
        .select(`
          id,
          name
        `)
        .eq("name", studentSection)
        .maybeSingle();

      if (sectionError) {
        console.error("Section error:", sectionError);
        throw sectionError;
      }

      if (!sectionData) {
        throw new Error(
          `لم يتم العثور على الشعبة "${studentSection}"`
        );
      }

      // =========================
      // SUBJECTS BY SECTION
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
            type,
            icon,
            icon_class,
            is_active,
            slug
          )
        `)
        .eq("section_id", sectionData.id);

      if (subjectSectionsError) {
        console.error(
          "Subject sections error:",
          subjectSectionsError
        );
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

      // =========================
      // UNITS
      // =========================
      const subjectIds = subjectsData.map(
        (subject) => subject.id
      );

      let unitsData = [];

      if (subjectIds.length) {
        const { data, error } = await supabase
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

        if (error) {
          console.error("Units error:", error);
          throw error;
        }

        unitsData = data || [];
      }

      // =========================
      // LESSONS
      // =========================
      const unitIds = unitsData.map(
        (unit) => unit.id
      );

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

        if (error) {
          console.error("Lessons error:", error);
          throw error;
        }

        lessonsData = data || [];
      }

      // =========================
      // SET DATA
      // =========================
      setNotes(notesData || []);
      setSubjects(subjectsData);
      setUnits(unitsData);
      setLessons(lessonsData);

    } catch (error) {
      console.error(
        "Fetch notes data error:",
        error
      );

      showError(
        error?.message ||
          "حدث خطأ أثناء تحميل الملاحظات"
      );
    } finally {
      setLoading(false);
    }
  }, [getCurrentUser]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  /* =========================
     REALTIME
  ========================= */
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`study-notes-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_notes",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchData]);
  /* =========================
     MAP DATA
  ========================= */
  const getSubject = (subjectId) => {
    return subjects.find(
      (subject) => subject.id === subjectId
    );
  };
  const getUnit = (unitId) => {
    return units.find(
      (unit) => unit.id === unitId
    );
  };
  const getLesson = (lessonId) => {
    return lessons.find(
      (lesson) => lesson.id === lessonId
    );
  };
  const getSubjectName = (subjectId) => {
    return (
      getSubject(subjectId)?.name ||
      "عام"
    );
  };
  const getUnitName = (unitId) => {
    return (
      getUnit(unitId)?.title ||
      ""
    );
  };
  const getLessonName = (lessonId) => {
    return (
      getLesson(lessonId)?.title ||
      ""
    );
  };
  /* =========================
     FOLDERS
  ========================= */
  const folders = useMemo(() => {
    const map = {};
    notes.forEach((note) => {
      const folder = note.folder?.trim() || "عام";
      if (!map[folder]) {
        map[folder] = 0;
      }
      map[folder]++;
    });
    return Object.entries(map)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [notes]);
  /* =========================
     STATISTICS
  ========================= */
  const statistics = useMemo(() => {
    const total = notes.length;
    const reviewed = notes.filter(
      (note) => note.status === "reviewed"
    ).length;
    const reviewing = notes.filter(
      (note) => note.status === "reviewing"
    ).length;
    const newNotes = notes.filter(
      (note) => note.status === "new"
    ).length;
    const uncategorized = notes.filter(
      (note) => note.status === "uncategorized"
    ).length;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const thisWeek = notes.filter(
      (note) => new Date(note.created_at) >= weekStart
    ).length;
    return {
      total,
      reviewed,
      reviewing,
      newNotes,
      uncategorized,
      thisWeek,
      reviewedPercent:
        total > 0 ? Math.round((reviewed / total) * 100) : 0,
      reviewingPercent:
        total > 0 ? Math.round((reviewing / total) * 100) : 0,
    };
  }, [notes]);
  /* =========================
     FILTERED NOTES
  ========================= */
  const filteredNotes = useMemo(() => {
    let result = [...notes];
    if (activeStatus !== "all") {
      result = result.filter(
        (note) => note.status === activeStatus
      );
    }
    if (activeSubject !== "all") {
      result = result.filter(
        (note) => note.subject_id === activeSubject
      );
    }
    if (activeFolder !== "all") {
      result = result.filter(
        (note) =>
          (note.folder?.trim() || "عام") === activeFolder
      );
    }
    if (search.trim()) {
      const value = search.trim().toLowerCase();
      result = result.filter((note) => {
        const subjectName = getSubjectName(note.subject_id);
        const unitName = getUnitName(note.unit_id);
        const lessonName = getLessonName(note.lesson_id);
        return (
          note.title?.toLowerCase().includes(value) ||
          note.content?.toLowerCase().includes(value) ||
          note.folder?.toLowerCase().includes(value) ||
          subjectName?.toLowerCase().includes(value) ||
          unitName?.toLowerCase().includes(value) ||
          lessonName?.toLowerCase().includes(value)
        );
      });
    }
    if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      );
    }
    if (sortBy === "oldest") {
      result.sort(
        (a, b) =>
          new Date(a.created_at) -
          new Date(b.created_at)
      );
    }
    if (sortBy === "pinned") {
      result.sort(
        (a, b) =>
          Number(b.is_pinned) -
          Number(a.is_pinned)
      );
    }
    if (sortBy === "title") {
      result.sort((a, b) =>
        (a.title || "").localeCompare(
          b.title || "",
          "ar"
        )
      );
    }
    return result;
  }, [
    notes,
    activeStatus,
    activeSubject,
    activeFolder,
    search,
    sortBy,
    subjects,
    units,
    lessons,
  ]);
  /* =========================
     OPEN ADD MODAL
  ========================= */
  const openAddModal = () => {
    setEditingNote(null);
    setForm({
      title: "",
      content: "",
      subject_id: "",
      unit_id: "",
      lesson_id: "",
      folder: "",
      status: "new",
      is_pinned: false,
      note_date: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
    setOpenMenu(null);
  };
  /* =========================
     OPEN EDIT MODAL
  ========================= */
  const openEditModal = (note) => {
    setEditingNote(note);
    setForm({
      title: note.title || "",
      content: note.content || "",
      subject_id: note.subject_id || "",
      unit_id: note.unit_id || "",
      lesson_id: note.lesson_id || "",
      folder: note.folder || "",
      status: note.status || "new",
      is_pinned: note.is_pinned || false,
      note_date:
        note.note_date ||
        new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
    setOpenMenu(null);
  };
  /* =========================
     SAVE NOTE
  ========================= */
  const saveNote = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showError("اكتب عنوان الملاحظة أولًا");
      return;
    }
    if (!form.content.trim()) {
      showError("اكتب محتوى الملاحظة أولًا");
      return;
    }
    if (!user?.id) {
      showError("لم يتم العثور على المستخدم");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        subject_id: form.subject_id || null,
        unit_id: form.unit_id || null,
        lesson_id: form.lesson_id || null,
        title: form.title.trim(),
        content: form.content.trim(),
        folder: form.folder.trim() || null,
        status: form.status,
        is_pinned: form.is_pinned,
        note_date: form.note_date,
      };
      if (editingNote) {
        const { error } = await supabase
          .from("study_notes")
          .update(payload)
          .eq("id", editingNote.id)
          .eq("user_id", user.id);
        if (error) throw error;
        showSuccess("تم تعديل الملاحظة بنجاح");
      } else {
        const { error } = await supabase
          .from("study_notes")
          .insert(payload);
        if (error) throw error;
        showSuccess("تمت إضافة الملاحظة بنجاح");
      }
      setShowModal(false);
      setEditingNote(null);
      await fetchData();
    } catch (error) {
      console.error("========== SAVE NOTE ERROR ==========");
      console.error("error:", error);
      console.error("message:", error?.message);
      console.error("details:", error?.details);
      console.error("hint:", error?.hint);
      console.error("code:", error?.code);
      console.error("payload:", {
        user_id: user?.id,
        subject_id: form.subject_id || null,
        unit_id: form.unit_id || null,
        lesson_id: form.lesson_id || null,
        title: form.title.trim(),
        content: form.content.trim(),
        folder: form.folder.trim() || null,
        status: form.status,
        is_pinned: form.is_pinned,
        note_date: form.note_date,
      });
      console.error("====================================");

      showError(
        error?.message ||
          (editingNote
            ? "حدث خطأ أثناء تعديل الملاحظة"
            : "حدث خطأ أثناء إضافة الملاحظة")
      );
    } finally {
        setSaving(false);
      }
    };
  /* =========================
     DELETE NOTE
  ========================= */
  const deleteNote = async (note) => {
    setOpenMenu(null);
    const result = await Swal.fire({
      title: "حذف الملاحظة؟",
      text: "لا يمكن التراجع عن حذف هذه الملاحظة.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "حذف",
      cancelButtonText: "إلغاء",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      const { error } = await supabase
        .from("study_notes")
        .delete()
        .eq("id", note.id)
        .eq("user_id", user.id);
      if (error) throw error;
      showSuccess("تم حذف الملاحظة");
      await fetchData();
    } catch (error) {
      console.error("Delete note error:", error);
      showError("حدث خطأ أثناء حذف الملاحظة");
    }
  };
  /* =========================
     PIN NOTE
  ========================= */
  const togglePin = async (note) => {
    setOpenMenu(null);
    try {
      const { error } = await supabase
        .from("study_notes")
        .update({
          is_pinned: !note.is_pinned,
        })
        .eq("id", note.id)
        .eq("user_id", user.id);
      if (error) throw error;
      showSuccess(
        note.is_pinned
          ? "تم إلغاء تثبيت الملاحظة"
          : "تم تثبيت الملاحظة"
      );
      await fetchData();
    } catch (error) {
      console.error("Pin note error:", error);
      showError("حدث خطأ أثناء تحديث الملاحظة");
    }
  };
  /* =========================
     UPDATE STATUS
  ========================= */
  const updateStatus = async (note, status) => {
    setOpenMenu(null);
    try {
      const { error } = await supabase
        .from("study_notes")
        .update({ status })
        .eq("id", note.id)
        .eq("user_id", user.id);
      if (error) throw error;
      showSuccess("تم تحديث حالة الملاحظة");
      await fetchData();
    } catch (error) {
      console.error("Status update error:", error);
      showError("حدث خطأ أثناء تحديث الحالة");
    }
  };
  /* =========================
     SUBJECTS USED
  ========================= */
  const usedSubjects = useMemo(() => {
    const ids = new Set(
      notes
        .map((note) => note.subject_id)
        .filter(Boolean)
    );
    return subjects.filter((subject) =>
      ids.has(subject.id)
    );
  }, [notes, subjects]);
  /* =========================
     FORM UNITS
  ========================= */
  const formUnits = useMemo(() => {
    if (!form.subject_id) return [];

    return units.filter(
      (unit) =>
        unit.subject_id === form.subject_id
    );
  }, [units, form.subject_id]);
  /* =========================
     FORM LESSONS
  ========================= */
  const formLessons = useMemo(() => {
    if (!form.unit_id) return [];
    return lessons.filter(
      (lesson) =>
        lesson.unit_id === form.unit_id
    );
  }, [lessons, form.unit_id]);
  /* =========================
     JSX
  ========================= */
  return (
    <main className="notes-page">
      <Header />
      {/* =========================
          TOP STATISTICS
      ========================= */}
      <section className="notes-stats">
        <article className="note-stat-card">
          <div className="note-stat-icon blue">
            <FaFileAlt />
          </div>
          <div className="note-stat-content">
            <h3>تمت إضافتها هذا الأسبوع</h3>
            <strong>{statistics.thisWeek}</strong>
            <span>ملاحظات</span>
            <div className="note-stat-growth">↑ ملاحظات جديدة</div>
          </div>
        </article>
        <article className="note-stat-card">
          <div className="note-stat-icon purple">
            <FaFolder />
          </div>
          <div className="note-stat-content">
            <h3>المجموع الكلي</h3>
            <strong>{statistics.total}</strong>
            <span>ملاحظة</span>
            <div className="note-stat-progress">
              <span style={{ width: "100%" }} />
            </div>
            <small>100%</small>
          </div>
        </article>
        <article className="note-stat-card">
          <div className="note-stat-icon orange">
            <FaClock />
          </div>
          <div className="note-stat-content">
            <h3>قيد المراجعة</h3>
            <strong>{statistics.reviewing}</strong>
            <span>ملاحظة</span>
            <div className="note-stat-progress orange-progress">
              <span
                style={{
                  width: `${statistics.reviewingPercent}%`,
                }}
              />
            </div>
            <small>{statistics.reviewingPercent}%</small>
          </div>
        </article>
        <article className="note-stat-card">
          <div className="note-stat-icon green">
            <FaCheckCircle />
          </div>
          <div className="note-stat-content">
            <h3>تمت المراجعة</h3>
            <strong>{statistics.reviewed}</strong>
            <span>ملاحظة</span>
            <div className="note-stat-progress green-progress">
              <span
                style={{
                  width: `${statistics.reviewedPercent}%`,
                }}
              />
            </div>
            <small>{statistics.reviewedPercent}%</small>
          </div>
        </article>
      </section>
      {/* =========================
          TOOLBAR
      ========================= */}
      <section className="notes-toolbar">
        <div className="notes-search">
          <FaSearch />
          <input
            type="text"
            placeholder="بحث في الملاحظات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="clear-search"
              onClick={() => setSearch("")}
            >
              <FaTimes />
            </button>
          )}
        </div>
        <div className="notes-filters">
          {/* STATUS */}
          <div className="filter-wrapper">
            <button
              className={`notes-filter-button ${
                activeStatus !== "all"
                  ? "filter-active"
                  : ""
              }`}
              onClick={() => {
                setShowStatusFilter(!showStatusFilter);
                setShowSubjectFilter(false);
                setShowFolderFilter(false);
                setShowSortFilter(false);
              }}
            >
              <span>
                {activeStatus === "all"
                  ? "كل الحالات"
                  : getStatusLabel(activeStatus)}
              </span>
              <FaFilter />
              <FaChevronDown />
            </button>
            {showStatusFilter && (
              <div className="filter-dropdown">
                <button
                  onClick={() => {
                    setActiveStatus("all");
                    setShowStatusFilter(false);
                  }}
                >
                  كل الحالات
                </button>
                <button
                  onClick={() => {
                    setActiveStatus("reviewed");
                    setShowStatusFilter(false);
                  }}
                >
                  <FaCheckCircle />
                  تمت المراجعة
                </button>
                <button
                  onClick={() => {
                    setActiveStatus("reviewing");
                    setShowStatusFilter(false);
                  }}
                >
                  <FaClock />
                  قيد المراجعة
                </button>
                <button
                  onClick={() => {
                    setActiveStatus("new");
                    setShowStatusFilter(false);
                  }}
                >
                  <span className="status-dot" />
                  جديدة
                </button>
                <button
                  onClick={() => {
                    setActiveStatus("uncategorized");
                    setShowStatusFilter(false);
                  }}
                >
                  غير مصنفة
                </button>
              </div>
            )}
          </div>
          {/* FOLDER */}
          <div className="filter-wrapper">
            <button
              className={`notes-filter-button ${
                activeFolder !== "all"
                  ? "filter-active"
                  : ""
              }`}
              onClick={() => {
                setShowFolderFilter(!showFolderFilter);
                setShowStatusFilter(false);
                setShowSubjectFilter(false);
                setShowSortFilter(false);
              }}
            >
              <span>
                {activeFolder === "all"
                  ? "كل المجلدات"
                  : activeFolder}
              </span>
              <FaFolder />
              <FaChevronDown />
            </button>
            {showFolderFilter && (
              <div className="filter-dropdown">
                <button
                  onClick={() => {
                    setActiveFolder("all");
                    setShowFolderFilter(false);
                  }}
                >
                  كل المجلدات
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder.name}
                    onClick={() => {
                      setActiveFolder(folder.name);
                      setShowFolderFilter(false);
                    }}
                  >
                    <FaFolder />
                    <span>{folder.name}</span>
                    <strong>{folder.count}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* SUBJECT */}
          <div className="filter-wrapper">
            <button
              className={`notes-filter-button ${
                activeSubject !== "all"
                  ? "filter-active"
                  : ""
              }`}
              onClick={() => {
                setShowSubjectFilter(!showSubjectFilter);
                setShowStatusFilter(false);
                setShowFolderFilter(false);
                setShowSortFilter(false);
              }}
            >
              <span>
                {activeSubject === "all"
                  ? "كل المواد"
                  : getSubjectName(activeSubject)}
              </span>
              <FaBook />
              <FaChevronDown />
            </button>
            {showSubjectFilter && (
              <div className="filter-dropdown">
                <button
                  onClick={() => {
                    setActiveSubject("all");
                    setShowSubjectFilter(false);
                  }}
                >
                  كل المواد
                </button>
                {usedSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => {
                      setActiveSubject(subject.id);
                      setShowSubjectFilter(false);
                    }}
                  >
                    {getSubjectIcon(
                      subject.name ||
                        subject.title ||
                        ""
                    )}
                    <span>
                      {subject.name ||
                        subject.title ||
                        "مادة"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* SORT */}
          <div className="filter-wrapper">
            <button
              className="notes-filter-button sort"
              onClick={() => {
                setShowSortFilter(!showSortFilter);
                setShowStatusFilter(false);
                setShowSubjectFilter(false);
                setShowFolderFilter(false);
              }}
            >
              <span>
                ترتيب:{" "}
                {sortBy === "newest"
                  ? "الأحدث أولًا"
                  : sortBy === "oldest"
                  ? "الأقدم أولًا"
                  : sortBy === "pinned"
                  ? "المثبتة أولًا"
                  : "حسب العنوان"}
              </span>
              <FaSortAmountDown />
              <FaChevronDown />
            </button>
            {showSortFilter && (
              <div className="filter-dropdown">
                <button
                  onClick={() => {
                    setSortBy("newest");
                    setShowSortFilter(false);
                  }}
                >
                  الأحدث أولًا
                </button>
                <button
                  onClick={() => {
                    setSortBy("oldest");
                    setShowSortFilter(false);
                  }}
                >
                  الأقدم أولًا
                </button>
                <button
                  onClick={() => {
                    setSortBy("pinned");
                    setShowSortFilter(false);
                  }}
                >
                  <FaThumbtack />
                  المثبتة أولًا
                </button>
                <button
                  onClick={() => {
                    setSortBy("title");
                    setShowSortFilter(false);
                  }}
                >
                  حسب العنوان
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
      {/* =========================
          CONTENT
      ========================= */}
      <section className="notes-layout">
        <div className="notes-main">
          {loading ? (
            <div className="notes-loading">
              <div className="notes-spinner" />
              <p>جاري تحميل الملاحظات...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="notes-empty">
              <div className="notes-empty-icon">
                <FaStickyNote />
              </div>
              <h2>
                {search ||
                activeStatus !== "all" ||
                activeSubject !== "all" ||
                activeFolder !== "all"
                  ? "لا توجد ملاحظات مطابقة"
                  : "لا توجد ملاحظات بعد"}
              </h2>
              <p>
                {search ||
                activeStatus !== "all" ||
                activeSubject !== "all" ||
                activeFolder !== "all"
                  ? "جرّب تغيير البحث أو الفلاتر."
                  : "ابدأ بإضافة أول ملاحظة لك."}
              </p>
              {!search &&
                activeStatus === "all" &&
                activeSubject === "all" &&
                activeFolder === "all" && (
                  <button
                    className="add-note-button"
                    onClick={openAddModal}
                  >
                    إضافة ملاحظة جديدة
                    <FaPlus />
                  </button>
                )}
            </div>
          ) : (
            <div className="notes-list">
              {filteredNotes.map((note) => {
                const subjectName = getSubjectName(note.subject_id);
                const unitName = getUnitName(note.unit_id);
                const lessonName = getLessonName(note.lesson_id);
                return (
                  <article
                    className="note-card"
                    key={note.id}
                  >
                    {/* MENU */}
                    <div className="note-menu-wrapper">
                      <button
                        className="note-menu"
                        onClick={() =>
                          setOpenMenu(
                            openMenu === note.id
                              ? null
                              : note.id
                          )
                        }
                      >
                        <FaEllipsisV />
                      </button>
                      {openMenu === note.id && (
                        <div className="note-actions-menu">
                          <button
                            onClick={() =>
                              openEditModal(note)
                            }
                          >
                            <FaEdit />
                            تعديل
                          </button>
                          <button
                            onClick={() =>
                              togglePin(note)
                            }
                          >
                            <FaThumbtack />
                            {note.is_pinned
                              ? "إلغاء التثبيت"
                              : "تثبيت الملاحظة"}
                          </button>
                          <button
                            onClick={() =>
                              updateStatus(
                                note,
                                note.status ===
                                  "reviewed"
                                  ? "reviewing"
                                  : "reviewed"
                              )
                            }
                          >
                            <FaCheckCircle />
                            {note.status ===
                            "reviewed"
                              ? "إرجاع للمراجعة"
                              : "تمت المراجعة"}
                          </button>
                          <button
                            className="danger"
                            onClick={() =>
                              deleteNote(note)
                            }
                          >
                            <FaTrash />
                            حذف
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="note-card-content">
                      <div className="note-card-info">
                        <div className="note-card-title-row">
                          <h2>{note.title}</h2>
                          {note.is_pinned && (
                            <span
                              className="note-pin"
                              title="ملاحظة مثبتة"
                            >
                              <FaThumbtack />
                            </span>
                          )}
                        </div>
                        <p>{note.content}</p>
                        <div className="note-meta">
                          <span
                            className={`note-status ${note.status}`}
                          >
                            {getStatusIcon(note.status)}
                            {getStatusLabel(note.status)}
                          </span>
                          {subjectName !== "عام" && (
                            <span className="note-subject">
                              <FaFolder />
                              {subjectName}
                            </span>
                          )}
                          {unitName && (
                            <span className="note-location">
                              {unitName}
                            </span>
                          )}
                          {lessonName && (
                            <span className="note-location">
                              {lessonName}
                            </span>
                          )}
                          <span className="note-time">
                            {formatRelativeTime(
                              note.created_at
                            )}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`note-icon ${getSubjectIconType(
                          subjectName
                        )}`}
                      >
                        {getSubjectIcon(subjectName)}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {/* ADD NOTE */}
          {!loading && (
            <div className="add-note-box">
              <div className="add-note-illustration">🌱</div>
              <div className="add-note-content">
                <h2>أضف ملاحظة جديدة</h2>
                <p>
                  دوّن أفكارك وملاحظاتك المهمة واحتفظ
                  بها لتنظيم المراجعة والعودة إليها في
                  أي وقت.
                </p>
              </div>
              <button
                className="add-note-button"
                onClick={openAddModal}
              >
                إضافة ملاحظة جديدة
                <FaPlus />
              </button>
            </div>
          )}
        </div>
        {/* =========================
            SIDEBAR
        ========================= */}
        <aside className="notes-sidebar">
          {/* FOLDERS */}
          <div className="notes-side-card">
            <div className="side-card-heading">
              <h2>المجلدات</h2>
              <button
                onClick={openAddModal}
                title="إضافة ملاحظة"
              >
                <FaPlus />
              </button>
            </div>
            <div className="folders-list">
              <button
                className={
                  activeFolder === "all"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFolder("all")
                }
              >
                <span>
                  <FaFolder />
                  كل الملاحظات
                </span>
                <strong>{notes.length}</strong>
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.name}
                  className={
                    activeFolder === folder.name
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveFolder(
                      activeFolder === folder.name
                        ? "all"
                        : folder.name
                    )
                  }
                >
                  <span>
                    <FaFolder />
                    {folder.name}
                  </span>
                  <strong>{folder.count}</strong>
                </button>
              ))}
            </div>
          </div>
          {/* STATUS */}
          <div className="notes-side-card">
            <div className="side-card-heading">
              <h2>الحالات</h2>
            </div>
            <div className="status-chart">
              <div className="status-donut">
                <div className="status-donut-inner">
                  <strong>{statistics.total}</strong>
                  <span>ملاحظة</span>
                </div>
              </div>
              <div className="status-list">
                <button
                  className={
                    activeStatus === "reviewed"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveStatus(
                      activeStatus === "reviewed"
                        ? "all"
                        : "reviewed"
                    )
                  }
                >
                  <span>
                    <i className="status-dot-large reviewed" />
                    تمت المراجعة
                  </span>
                  <strong>{statistics.reviewed}</strong>
                </button>
                <button
                  className={
                    activeStatus === "reviewing"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveStatus(
                      activeStatus === "reviewing"
                        ? "all"
                        : "reviewing"
                    )
                  }
                >
                  <span>
                    <i className="status-dot-large reviewing" />
                    قيد المراجعة
                  </span>
                  <strong>{statistics.reviewing}</strong>
                </button>
                <button
                  className={
                    activeStatus === "new"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveStatus(
                      activeStatus === "new"
                        ? "all"
                        : "new"
                    )
                  }
                >
                  <span>
                    <i className="status-dot-large new" />
                    جديدة
                  </span>
                  <strong>{statistics.newNotes}</strong>
                </button>
                <button
                  className={
                    activeStatus === "uncategorized"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveStatus(
                      activeStatus ===
                        "uncategorized"
                        ? "all"
                        : "uncategorized"
                    )
                  }
                >
                  <span>
                    <i className="status-dot-large uncategorized" />
                    غير مصنفة
                  </span>
                  <strong>{statistics.uncategorized}</strong>
                </button>
              </div>
            </div>
            <button
              className="view-statistics"
              onClick={() => {
                setActiveStatus("all");
                setActiveSubject("all");
                setActiveFolder("all");
                setSearch("");
              }}
            >
              عرض كل الملاحظات
              <FaChartPie />
            </button>
          </div>
          {/* MOST USED */}
          <div className="notes-side-card most-used">
            <div className="side-card-heading">
              <h2>الأكثر استخدامًا</h2>
            </div>
            {folders.slice(0, 3).map((folder) => {
              const folderNote = notes.find(
                (note) =>
                  (note.folder?.trim() || "عام") ===
                  folder.name
              );
              const subjectName = folderNote
                ? getSubjectName(
                    folderNote.subject_id
                  )
                : folder.name;
              return (
                <div
                  className="most-used-item"
                  key={folder.name}
                >
                  <div
                    className={`most-used-icon ${getSubjectIconType(
                      subjectName
                    )}`}
                  >
                    {getSubjectIcon(subjectName)}
                  </div>
                  <div>
                    <strong>{folder.name}</strong>
                    <span>
                      {folder.count}{" "}
                      {folder.count === 1
                        ? "ملاحظة"
                        : "ملاحظات"}
                    </span>
                  </div>
                </div>
              );
            })}
            {folders.length === 0 && (
              <div className="most-used-empty">
                لا توجد مجلدات بعد
              </div>
            )}
            <button
              className="view-all-notes"
              onClick={() => {
                setActiveFolder("all");
                setSearch("");
              }}
            >
              عرض الكل
            </button>
          </div>
        </aside>
      </section>
      {/* =========================
          ADD / EDIT MODAL
      ========================= */}
      {showModal && (
        <div
          className="note-modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target.classList.contains(
                "note-modal-overlay"
              )
            ) {
              setShowModal(false);
            }
          }}
        >
          <div className="note-modal">
            <div className="note-modal-header">
              <div>
                <h2>
                  {editingNote
                    ? "تعديل الملاحظة"
                    : "إضافة ملاحظة جديدة"}
                </h2>
                <p>
                  اكتب ملاحظتك واحفظها لتنظيم مذاكرتك.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="modal-close"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={saveNote}>
              {/* TITLE */}
              <div className="form-group">
                <label>عنوان الملاحظة</label>
                <input
                  type="text"
                  placeholder="مثال: قوانين نيوتن الثلاثة"
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                    })
                  }
                />
              </div>
              {/* CONTENT */}
              <div className="form-group">
                <label>المحتوى</label>
                <textarea
                  rows="6"
                  placeholder="اكتب ملاحظتك هنا..."
                  value={form.content}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      content: e.target.value,
                    })
                  }
                />
              </div>
              {/* SUBJECT */}
              <div className="form-row">
                <div className="form-group">
                  <label>المادة</label>
                  <select
                    value={form.subject_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        subject_id: e.target.value,
                        unit_id: "",
                        lesson_id: "",
                      })
                    }
                  >
                    <option value="">بدون مادة</option>
                    {subjects.map((subject) => (
                      <option
                        key={subject.id}
                        value={subject.id}
                      >
                        {subject.name ||
                          subject.title ||
                          "مادة"}
                      </option>
                    ))}
                  </select>
                </div>
                {/* UNIT */}
                <div className="form-group">
                  <label>الوحدة</label>
                  <select
                    value={form.unit_id}
                    disabled={!form.subject_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        unit_id: e.target.value,
                        lesson_id: "",
                      })
                    }
                  >
                    <option value="">بدون وحدة</option>
                    {formUnits.map((unit) => (
                    <option
                      key={unit.id}
                      value={unit.id}
                    >
                      {unit.title}
                    </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* LESSON + FOLDER */}
              <div className="form-row">
                <div className="form-group">
                  <label>الدرس</label>
                  <select
                    value={form.lesson_id}
                    disabled={!form.unit_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        lesson_id:
                          e.target.value,
                      })
                    }
                  >
                    <option value="">بدون درس</option>
                    {formLessons.map((lesson) => (
                    <option
                      key={lesson.id}
                      value={lesson.id}
                    >
                      {lesson.title}
                    </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>المجلد</label>
                  <input
                    type="text"
                    placeholder="مثال: الفيزياء"
                    value={form.folder}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        folder: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              {/* STATUS + DATE */}
              <div className="form-row">
                <div className="form-group">
                  <label>الحالة</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="new">جديدة</option>
                    <option value="reviewing">قيد المراجعة</option>
                    <option value="reviewed">تمت المراجعة</option>
                    <option value="uncategorized">غير مصنفة</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>تاريخ الملاحظة</label>
                  <input
                    type="date"
                    value={form.note_date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        note_date:
                          e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              {/* PIN */}
              <label className="pin-checkbox">
                <input
                  type="checkbox"
                  checked={form.is_pinned}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      is_pinned:
                        e.target.checked,
                    })
                  }
                />
                <span>
                  <FaThumbtack />
                  تثبيت الملاحظة في الأعلى
                </span>
              </label>
              {/* ACTIONS */}
              <div className="note-modal-actions">
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={() =>
                    setShowModal(false)
                  }
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="modal-save"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="button-spinner" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <FaSave />
                      {editingNote
                        ? "حفظ التعديلات"
                        : "إضافة الملاحظة"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
export default Notes;