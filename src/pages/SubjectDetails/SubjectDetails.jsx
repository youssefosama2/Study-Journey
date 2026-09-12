import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import {
  FaBook,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaClipboardCheck,
  FaClock,
  FaExclamationTriangle,
  FaGraduationCap,
  FaRedo,
  FaStar,
  FaTimes,
  FaTrophy,
} from "react-icons/fa";

import { FiRefreshCw } from "react-icons/fi";

import Swal from "sweetalert2";

import Header from "../../components/Header/Header";
import { supabase } from "../../utils/supabaseClient";

import "./SubjectDetails.css";

/* =========================================================
   HELPERS
========================================================= */

const getReviewInfo = (score, total) => {
  if (
    score === null ||
    score === undefined ||
    total === null ||
    total === undefined ||
    !total
  ) {
    return {
      type: "none",
      label: "لم يتم الاختبار",
    };
  }

  const percentage = (Number(score) / Number(total)) * 100;

  if (percentage < 50) {
    return {
      type: "urgent",
      label: "مراجعة عاجلة",
    };
  }

  if (percentage < 70) {
    return {
      type: "soon",
      label: "تحتاج مراجعة",
    };
  }

  if (percentage < 85) {
    return {
      type: "normal",
      label: "مراجعة قريبة",
    };
  }

  return {
    type: "good",
    label: "مستوى جيد",
  };
};

/* =========================================================
   REVIEW DATE
========================================================= */

const formatReviewDate = (date) => {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "";
  }
};

const getReviewDateStatus = (review) => {
  if (!review?.scheduled_at) {
    return null;
  }

  const today = new Date();
  const scheduled = new Date(review.scheduled_at);

  today.setHours(0, 0, 0, 0);
  scheduled.setHours(0, 0, 0, 0);

  if (review.status === "completed") {
    return {
      type: "completed",
      label: "تمت المراجعة",
    };
  }

  if (review.status === "skipped") {
    return {
      type: "skipped",
      label: "تم تخطي المراجعة",
    };
  }

  if (scheduled < today) {
    return {
      type: "overdue",
      label: "مراجعة متأخرة",
    };
  }

  if (scheduled.getTime() === today.getTime()) {
    return {
      type: "today",
      label: "مراجعة اليوم",
    };
  }

  return {
    type: "upcoming",
    label: "مراجعة قادمة",
  };
};

/* =========================================================
   COMPONENT
========================================================= */

const SubjectDetails = () => {
  const { subjectId } = useParams();

  /* =========================================================
     USER
  ========================================================= */

  const [userId, setUserId] = useState(null);

  /* =========================================================
     SUBJECT
  ========================================================= */

  const [subject, setSubject] = useState(null);
  const [units, setUnits] = useState([]);

  /* =========================================================
     STUDY
  ========================================================= */

  const [studyRecords, setStudyRecords] = useState([]);

  /* =========================================================
     REVIEWS
  ========================================================= */

  const [reviewRecords, setReviewRecords] = useState([]);

  /* =========================================================
     UI
  ========================================================= */

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState("lessons");

  const [openUnits, setOpenUnits] = useState([]);

  const toggleChildUnit = (unitId) => {
    setOpenUnits((prev) =>
      prev.includes(unitId)
        ? prev.filter((id) => id !== unitId)
        : [...prev, unitId]
    );
  };

  /* =========================================================
     EXAM MODAL
  ========================================================= */

  const [showExamModal, setShowExamModal] = useState(false);

  const [selectedLesson, setSelectedLesson] = useState(null);

  const [examScore, setExamScore] = useState("");

  const [examTotal, setExamTotal] = useState("10");

  /* =========================================================
     LOAD DATA
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadSubjectData = async () => {
      try {
        setLoading(true);

        /* =====================================================
           AUTH USER
        ===================================================== */

        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const user = authData?.user;

        if (!user) {
          throw new Error("لم يتم العثور على المستخدم.");
        }

        if (!mounted) return;

        setUserId(user.id);

        /* =====================================================
           SUBJECT
        ===================================================== */

        const {
          data: subjectData,
          error: subjectError,
        } = await supabase
          .from("subjects")
          .select(`
            id,
            name,
            subtitle,
            icon,
            icon_class,
            slug
          `)
          .eq("slug", subjectId)
          .eq("is_active", true)
          .maybeSingle();

        if (subjectError) {
          throw subjectError;
        }

        if (!subjectData) {
          throw new Error("المادة غير موجودة.");
        }

        /* =====================================================
           UNITS + LESSONS
           
           المصدر الأساسي للمنهج:
           
           units
              ↓
           lessons
        ===================================================== */

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
            is_active,
            lessons (
              id,
              unit_id,
              title,
              sort_order,
              is_active
            )
          `)
          .eq("subject_id", subjectData.id)
          .eq("is_active", true)
          .order("sort_order", {
            ascending: true,
          });

        if (unitsError) {
          throw unitsError;
        }

        /* =====================================================
           FORMAT CURRICULUM
           
           يدعم:
           
           وحدة رئيسية
              ↓
           وحدة فرعية
              ↓
           دروس
        ===================================================== */

        const activeUnits = (unitsData || []).filter(
          (unit) => unit.is_active
        );

        const formattedUnits = (unitsData || [])
          .filter((unit) => !unit.parent_unit_id)
          .map((unit) => {
            const childUnits = (unitsData || [])
              .filter(
                (child) =>
                  child.parent_unit_id === unit.id &&
                  child.is_active
              )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((child) => ({
                id: child.id,
                unitNumber: child.sort_order,
                title: child.title,

                lessons: (child.lessons || [])
                  .filter((lesson) => lesson.is_active)
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((lesson) => ({
                    id: lesson.id,
                    lessonNumber: lesson.sort_order,
                    title: lesson.title,
                  })),
              }));

            const directLessons = (unit.lessons || [])
              .filter((lesson) => lesson.is_active)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((lesson) => ({
                id: lesson.id,
                lessonNumber: lesson.sort_order,
                title: lesson.title,
              }));

            return {
              id: unit.id,
              unitNumber: unit.sort_order,
              title: unit.title,
              lessons: directLessons,
              childUnits,
            };
          });

        /* =====================================================
           COLLECT ALL LESSON IDS
        ===================================================== */

        const lessonIds = formattedUnits.flatMap((unit) => [
          ...unit.lessons.map((lesson) => lesson.id),

          ...unit.childUnits.flatMap((child) =>
            child.lessons.map((lesson) => lesson.id)
          ),
        ]);

        /* =====================================================
           STUDY RECORDS
           
           IMPORTANT:
           
           نستخدم curriculum_lesson_id
           لأنه مربوط بـ lessons.id
        ===================================================== */

        let studyData = [];

        if (lessonIds.length > 0) {
          const {
            data,
            error: studyError,
          } = await supabase
            .from("student_lesson_study")
            .select(`
              id,
              user_id,
              subject_id,
              unit_id,
              lesson_id,
              curriculum_lesson_id,
              curriculum_unit_id,
              studied_at,
              study_minutes,
              score,
              exam_total,
              notes,
              created_at
            `)
            .eq("user_id", user.id)
            .eq("subject_id", subjectData.id)
            .in("curriculum_lesson_id", lessonIds)
            .order("created_at", {
              ascending: false,
            });

          if (studyError) {
            throw studyError;
          }

          studyData = data || [];
        }

        /* =====================================================
           REVIEWS
           
           نستخدم curriculum_lesson_id
           لأنه مربوط بـ lessons.id
        ===================================================== */

        let reviewsData = [];

        if (lessonIds.length > 0) {
          const {
            data,
            error: reviewsError,
          } = await supabase
            .from("student_lesson_reviews")
            .select(`
              id,
              user_id,
              lesson_id,
              curriculum_lesson_id,
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
            `)
            .eq("user_id", user.id)
            .in(
              "curriculum_lesson_id",
              lessonIds
            )
            .order("scheduled_at", {
              ascending: true,
            });

          if (reviewsError) {
            throw reviewsError;
          }

          reviewsData = data || [];
        }

        if (!mounted) return;

        setSubject(subjectData);

        setUnits(formattedUnits);

        setStudyRecords(studyData);

        setReviewRecords(reviewsData);

        setOpenUnits(
          formattedUnits.length > 0
            ? [formattedUnits[0].id]
            : []
        );

        setActiveTab("lessons");
      } catch (error) {
        console.error(
          "SubjectDetails load error:",
          error
        );

        if (!mounted) return;

        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            error?.message ||
            "تعذر تحميل بيانات المادة.",
          confirmButtonText: "حسنًا",
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSubjectData();

    return () => {
      mounted = false;
    };
  }, [subjectId]);

  /* =========================================================
     SUBJECT ICON
  ========================================================= */

  const subjectIcon = useMemo(() => {
    return <FaBook />;
  }, []);

  /* =========================================================
     LATEST STUDY PER LESSON
  ========================================================= */

  const latestStudyMap = useMemo(() => {
    const map = {};

    studyRecords.forEach((record) => {
      const lessonId = record.curriculum_lesson_id;

      if (!lessonId) {
        return;
      }

      if (!map[lessonId]) {
        map[lessonId] = record;
      }
    });

    return map;
  }, [studyRecords]);

  /* =========================================================
     LATEST REVIEW PER LESSON
  ========================================================= */

  const latestReviewMap = useMemo(() => {
    const map = {};

    reviewRecords.forEach((review) => {
      const lessonId =
        review.curriculum_lesson_id;

      if (!lessonId) {
        return;
      }

      const existing = map[lessonId];

      if (!existing) {
        map[lessonId] = review;
        return;
      }

      const existingTime = existing.scheduled_at
        ? new Date(
            existing.scheduled_at
          ).getTime()
        : Infinity;

      const currentTime = review.scheduled_at
        ? new Date(
            review.scheduled_at
          ).getTime()
        : Infinity;

      if (
        review.status !== "completed" &&
        existing.status === "completed"
      ) {
        map[lessonId] = review;
        return;
      }

      if (
        review.status !== "completed" &&
        existing.status !== "completed" &&
        currentTime < existingTime
      ) {
        map[lessonId] = review;
      }
    });

    return map;
  }, [reviewRecords]);

  /* =========================================================
     ALL LESSONS
  ========================================================= */

  const allLessons = useMemo(() => {
  const result = [];

  units.forEach((unit) => {
    // دروس الوحدة الرئيسية
    unit.lessons.forEach((lesson) => {
      const state = latestStudyMap[lesson.id] || null;

      const hasScore =
        state?.score !== null &&
        state?.score !== undefined;

      const total =
        state?.exam_total !== null &&
        state?.exam_total !== undefined
          ? Number(state.exam_total)
          : hasScore
          ? 10
          : null;

      result.push({
        id: lesson.id,

        unitId: unit.id,
        unitTitle: unit.title,
        unitNumber: unit.unitNumber,

        parentUnitId: null,
        parentUnitTitle: null,

        lessonNumber: lesson.lessonNumber,
        title: lesson.title,

        studyId: state?.id || null,

        completed:
          Number(state?.study_minutes || 0) > 0,

        studyMinutes:
          Number(state?.study_minutes || 0),

        score: hasScore
          ? Number(state.score)
          : null,

        total:
          hasScore && total
            ? Number(total)
            : null,

        studiedAt:
          state?.studied_at || null,

        createdAt:
          state?.created_at || null,

        latestReview:
          latestReviewMap[lesson.id] || null,
      });
    });

    // دروس الوحدات الفرعية
    unit.childUnits.forEach((childUnit) => {
      childUnit.lessons.forEach((lesson) => {
        const state =
          latestStudyMap[lesson.id] || null;

        const hasScore =
          state?.score !== null &&
          state?.score !== undefined;

        const total =
          state?.exam_total !== null &&
          state?.exam_total !== undefined
            ? Number(state.exam_total)
            : hasScore
            ? 10
            : null;

        result.push({
          id: lesson.id,

          unitId: childUnit.id,
          unitTitle: childUnit.title,
          unitNumber: childUnit.unitNumber,

          parentUnitId: unit.id,
          parentUnitTitle: unit.title,

          lessonNumber: lesson.lessonNumber,
          title: lesson.title,

          studyId: state?.id || null,

          completed:
            Number(state?.study_minutes || 0) > 0,

          studyMinutes:
            Number(state?.study_minutes || 0),

          score: hasScore
            ? Number(state.score)
            : null,

          total:
            hasScore && total
              ? Number(total)
              : null,

          studiedAt:
            state?.studied_at || null,

          createdAt:
            state?.created_at || null,

          latestReview:
            latestReviewMap[lesson.id] || null,
        });
      });
    });
  });

  return result;
  }, [units, latestStudyMap, latestReviewMap]);

  /* =========================================================
     STATISTICS
  ========================================================= */

  const statistics = useMemo(() => {
    const total = allLessons.length;

    const completed = allLessons.filter(
      (lesson) => lesson.completed
    ).length;

    const exams = allLessons.filter(
      (lesson) =>
        lesson.score !== null &&
        lesson.total !== null &&
        lesson.total > 0
    );

    const average =
      exams.length > 0
        ? exams.reduce(
            (sum, lesson) =>
              sum +
              (lesson.score /
                lesson.total) *
                100,
            0
          ) / exams.length
        : 0;

    const urgentLessons = exams.filter(
      (lesson) =>
        lesson.score / lesson.total <
        0.5
    );

    const now = new Date();

    const dueReviews =
      reviewRecords.filter((review) => {
        if (
          review.status === "completed" ||
          review.status === "skipped"
        ) {
          return false;
        }

        if (!review.scheduled_at) {
          return false;
        }

        return (
          new Date(
            review.scheduled_at
          ) <= now
        );
      });

    return {
      total,

      completed,

      remaining:
        total - completed,

      progress:
        total > 0
          ? Math.round(
              (completed / total) * 100
            )
          : 0,

      exams: exams.length,

      average: Math.round(average),

      reviewCount:
        dueReviews.length,

      urgentCount:
        urgentLessons.length,

      dueReviewsCount:
        dueReviews.length,
    };
  }, [
    allLessons,
    reviewRecords,
  ]);

  /* =========================================================
     REVIEW LESSONS
  ========================================================= */

  const reviewLessons = useMemo(() => {
    const now = new Date();

    const dueReviews =
      reviewRecords.filter((review) => {
        if (
          review.status === "completed" ||
          review.status === "skipped"
        ) {
          return false;
        }

        if (!review.scheduled_at) {
          return false;
        }

        return (
          new Date(
            review.scheduled_at
          ) <= now
        );
      });

    const uniqueLessonIds =
      new Set();

    const result = [];

    dueReviews.forEach((review) => {
      const lessonId =
        review.curriculum_lesson_id;

      if (
        uniqueLessonIds.has(lessonId)
      ) {
        return;
      }

      const lesson =
        allLessons.find(
          (item) =>
            item.id === lessonId
        );

      if (!lesson) {
        return;
      }

      uniqueLessonIds.add(lessonId);

      result.push({
        ...lesson,
        review,
      });
    });

    /*
      لو مفيش مراجعات مستحقة حاليًا،
      نعرض الدروس الضعيفة.
    */

    if (result.length === 0) {
      return allLessons
        .filter(
          (lesson) =>
            lesson.score !== null &&
            lesson.total !== null &&
            lesson.total > 0 &&
            lesson.score /
              lesson.total <
              0.85
        )
        .sort(
          (a, b) =>
            a.score / a.total -
            b.score / b.total
        );
    }

    return result.sort(
      (a, b) => {
        const aOverdue =
          a.review?.scheduled_at &&
          new Date(
            a.review.scheduled_at
          ) < now;

        const bOverdue =
          b.review?.scheduled_at &&
          new Date(
            b.review.scheduled_at
          ) < now;

        if (
          aOverdue &&
          !bOverdue
        ) {
          return -1;
        }

        if (
          !aOverdue &&
          bOverdue
        ) {
          return 1;
        }

        if (
          a.score !== null &&
          b.score !== null &&
          a.total > 0 &&
          b.total > 0
        ) {
          return (
            a.score / a.total -
            b.score / b.total
          );
        }

        return 0;
      }
    );
  }, [
    reviewRecords,
    allLessons,
  ]);

  /* =========================================================
     GET OR CREATE STUDY RECORD
     
     IMPORTANT:
     
     curriculum_lesson_id
     هو الـ FK الجديد إلى lessons.id
  ========================================================= */

  const getOrCreateStudyRecord =
    async (lesson) => {
      if (!userId || !subject) {
        throw new Error(
          "بيانات المستخدم أو المادة غير متاحة."
        );
      }

      const existing =
        latestStudyMap[lesson.id];

      if (existing) {
        return existing;
      }

      const {
        data,
        error,
      } = await supabase
        .from("student_lesson_study")
        .insert({
          user_id: userId,

          subject_id: subject.id,

          unit_id: null,

          curriculum_unit_id:
            lesson.unitId,

          /*
            مهم:
            lesson_id القديم أصبح NULL
          */

          lesson_id: null,

          curriculum_lesson_id:
            lesson.id,

          studied_at:
            new Date().toISOString(),

          study_minutes: 0,
        })
        .select(`
          id,
          user_id,
          subject_id,
          unit_id,
          lesson_id,
          curriculum_lesson_id,
          curriculum_unit_id,
          studied_at,
          study_minutes,
          score,
          exam_total,
          notes,
          created_at
        `)
        .single();

      if (error) {
        throw error;
      }

      setStudyRecords(
        (prev) => [
          data,
          ...prev,
        ]
      );

      return data;
    };

  /* =========================================================
     TOGGLE LESSON
  ========================================================= */

  const toggleLesson =
    async (lesson) => {
      if (
        saving ||
        !lesson ||
        !userId ||
        !subject
      ) {
        return;
      }

      try {
        setSaving(true);

        const existing =
          latestStudyMap[lesson.id];

        /* =====================================================
           FIRST STUDY
        ===================================================== */

        if (!existing) {
          const {
            data,
            error,
          } = await supabase
            .from(
              "student_lesson_study"
            )
            .insert({
              user_id: userId,

              subject_id:
                subject.id,

              unit_id: null,

              curriculum_unit_id:
                lesson.unitId,

              lesson_id: null,

              curriculum_lesson_id:
                lesson.id,

              studied_at:
                new Date().toISOString(),

              study_minutes: 1,
            })
            .select(`
              id,
              user_id,
              subject_id,
              unit_id,
              lesson_id,
              curriculum_lesson_id,
              curriculum_unit_id,
              studied_at,
              study_minutes,
              score,
              exam_total,
              notes,
              created_at
            `)
            .single();

          if (error) {
            throw error;
          }

          setStudyRecords(
            (prev) => [
              data,
              ...prev,
            ]
          );

          return;
        }

        /* =====================================================
           TOGGLE
        ===================================================== */

        const isCompleted =
          Number(
            existing.study_minutes ||
              0
          ) > 0;

        const {
          data,
          error,
        } = await supabase
          .from(
            "student_lesson_study"
          )
          .update({
            study_minutes:
              isCompleted
                ? 0
                : 1,

            studied_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            existing.id
          )
          .eq(
            "user_id",
            userId
          )
          .select(`
            id,
            user_id,
            subject_id,
            unit_id,
            lesson_id,
            curriculum_lesson_id,
            curriculum_unit_id,
            studied_at,
            study_minutes,
            score,
            exam_total,
            notes,
            created_at
          `)
          .single();

        if (error) {
          throw error;
        }

        setStudyRecords(
          (prev) =>
            prev.map(
              (record) =>
                record.id ===
                data.id
                  ? data
                  : record
            )
        );
      } catch (error) {
        console.error(
          "toggleLesson error:",
          error
        );

        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            error?.message ||
            "تعذر تحديث حالة الدرس.",
          confirmButtonText:
            "حسنًا",
        });
      } finally {
        setSaving(false);
      }
    };

  /* =========================================================
     OPEN EXAM MODAL
  ========================================================= */

  const openExamModal =
    (lesson) => {
      if (!lesson) {
        return;
      }

      const current =
        latestStudyMap[lesson.id];

      const total =
        current?.exam_total !==
          null &&
        current?.exam_total !==
          undefined &&
        Number(
          current.exam_total
        ) > 0
          ? Number(
              current.exam_total
            )
          : 10;

      setSelectedLesson(lesson);

      setExamScore(
        current?.score !==
          null &&
          current?.score !==
            undefined
          ? String(
              current.score
            )
          : ""
      );

      setExamTotal(
        String(total)
      );

      setShowExamModal(true);
    };

  /* =========================================================
     SAVE EXAM
  ========================================================= */

  const saveExam =
    async () => {
      if (
        !selectedLesson ||
        saving
      ) {
        return;
      }

      const score =
        Number(examScore);

      const total =
        Number(examTotal);

      /* =====================================================
         VALIDATE
      ===================================================== */

      if (
        !Number.isFinite(score) ||
        !Number.isFinite(total) ||
        total <= 0 ||
        score < 0 ||
        score > total
      ) {
        Swal.fire({
          icon: "warning",
          title: "بيانات غير صحيحة",
          text:
            "تأكد أن الدرجة بين 0 والدرجة النهائية.",
          confirmButtonText:
            "حسنًا",
        });

        return;
      }

      try {
        setSaving(true);

        let studyRecord =
          latestStudyMap[
            selectedLesson.id
          ];

        /* =====================================================
           CREATE STUDY RECORD
        ===================================================== */

        if (!studyRecord) {
          studyRecord =
            await getOrCreateStudyRecord(
              selectedLesson
            );
        }

        /* =====================================================
           SAVE EXAM
        ===================================================== */

        const {
          data,
          error,
        } = await supabase
          .from(
            "student_lesson_study"
          )
          .update({
            score,

            exam_total:
              total,

            study_minutes:
              Number(
                studyRecord.study_minutes ||
                  0
              ) > 0
                ? studyRecord.study_minutes
                : 1,

            studied_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            studyRecord.id
          )
          .eq(
            "user_id",
            userId
          )
          .select(`
            id,
            user_id,
            subject_id,
            unit_id,
            lesson_id,
            curriculum_lesson_id,
            curriculum_unit_id,
            studied_at,
            study_minutes,
            score,
            exam_total,
            notes,
            created_at
          `)
          .single();

        if (error) {
          throw error;
        }

        setStudyRecords(
          (prev) =>
            prev.map(
              (record) =>
                record.id ===
                data.id
                  ? data
                  : record
            )
        );

        setShowExamModal(false);

        setSelectedLesson(
          null
        );

        setExamScore("");

        setExamTotal("10");

        Swal.fire({
          icon: "success",
          title: "تم حفظ النتيجة",
          text:
            "تم تحديث نتيجة الاختبار والإحصائيات.",
          timer: 1600,
          showConfirmButton:
            false,
        });
      } catch (error) {
        console.error(
          "saveExam error:",
          error
        );

        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            error?.message ||
            "تعذر حفظ نتيجة الاختبار.",
          confirmButtonText:
            "حسنًا",
        });
      } finally {
        setSaving(false);
      }
    };

  /* =========================================================
     REMOVE EXAM
  ========================================================= */

  const removeExam =
    async () => {
      if (
        !selectedLesson ||
        saving
      ) {
        return;
      }

      const confirmed =
        await Swal.fire({
          icon: "warning",

          title:
            "حذف النتيجة؟",

          text:
            "سيتم حذف نتيجة الاختبار والمراجعات المرتبطة به.",

          showCancelButton:
            true,

          confirmButtonText:
            "حذف",

          cancelButtonText:
            "إلغاء",

          reverseButtons:
            true,
        });

      if (
        !confirmed.isConfirmed
      ) {
        return;
      }

      try {
        setSaving(true);

        const existing =
          latestStudyMap[
            selectedLesson.id
          ];

        if (!existing) {
          return;
        }

        /* =====================================================
           DELETE REVIEWS
        ===================================================== */

        const {
          error: reviewError,
        } = await supabase
          .from(
            "student_lesson_reviews"
          )
          .delete()
          .eq(
            "study_id",
            existing.id
          )
          .eq(
            "user_id",
            userId
          );

        if (reviewError) {
          throw reviewError;
        }

        /* =====================================================
           REMOVE EXAM
        ===================================================== */

        const {
          data,
          error,
        } = await supabase
          .from(
            "student_lesson_study"
          )
          .update({
            score: null,

            exam_total: null,
          })
          .eq(
            "id",
            existing.id
          )
          .eq(
            "user_id",
            userId
          )
          .select(`
            id,
            user_id,
            subject_id,
            unit_id,
            lesson_id,
            curriculum_lesson_id,
            curriculum_unit_id,
            studied_at,
            study_minutes,
            score,
            exam_total,
            notes,
            created_at
          `)
          .single();

        if (error) {
          throw error;
        }

        /* =====================================================
           UPDATE STATE
        ===================================================== */

        setStudyRecords(
          (prev) =>
            prev.map(
              (record) =>
                record.id ===
                data.id
                  ? data
                  : record
            )
        );

        setReviewRecords(
          (prev) =>
            prev.filter(
              (review) =>
                review.study_id !==
                existing.id
            )
        );

        setShowExamModal(false);

        setSelectedLesson(
          null
        );

        Swal.fire({
          icon: "success",
          title:
            "تم حذف النتيجة",
          text:
            "تم حذف نتيجة الاختبار والمراجعات المرتبطة به.",
          timer: 1600,
          showConfirmButton:
            false,
        });
      } catch (error) {
        console.error(
          "removeExam error:",
          error
        );

        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            error?.message ||
            "تعذر حذف نتيجة الاختبار.",
          confirmButtonText:
            "حسنًا",
        });
      } finally {
        setSaving(false);
      }
    };

  /* =========================================================
     UNIT TOGGLE
  ========================================================= */

  const toggleUnit =
    (unitId) => {
      setOpenUnits(
        (prev) =>
          prev.includes(unitId)
            ? prev.filter(
                (id) =>
                  id !== unitId
              )
            : [
                ...prev,
                unitId,
              ]
      );
    };

  const openAllUnits = () => {
    const allIds = [];

    units.forEach((unit) => {
      allIds.push(unit.id);

      unit.childUnits?.forEach((childUnit) => {
        allIds.push(childUnit.id);
      });
    });

    setOpenUnits(allIds);
  };

  const closeAllUnits =
    () => {
      setOpenUnits([]);
    };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="subject-details-page">
        <Header />

        <div className="page-loading">
          <div className="page-loading-spinner">
            <FiRefreshCw />
          </div>

          <h3>
            جاري تجهيز المادة...
          </h3>

          <p>
            بنحمّل دروسك وتقدمك
            وآخر مراجعاتك.
          </p>
        </div>
      </main>
    );
  }

  /* =========================================================
     SUBJECT NOT FOUND
  ========================================================= */

  if (!subject) {
    return (
      <main className="subject-details-page">
        <Header />

        <div className="empty-state">
          <div>
            <FaExclamationTriangle />
          </div>

          <h3>
            المادة غير موجودة
          </h3>

          <p>
            لم نتمكن من العثور
            على المادة المطلوبة.
          </p>
        </div>
      </main>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <main className="subject-details-page">
        <Header />

        {/* =====================================================
            SUBJECT HEADER
        ===================================================== */}

        <section className="subject-page-header">
          <div className="subject-page-title">
            <div
              className={`large-subject-icon ${
                subject.icon_class ||
                "arabic-icon"
              }`}
            >
              {subjectIcon}
            </div>

            <div>
              <h1>
                {subject.name}
              </h1>

              <p>
                {subject.subtitle ||
                  "تابع دروسك وسجل نتائجك مع المدرس"}
              </p>
            </div>
          </div>

          <div className="subject-overall-progress">
            <div className="progress-title">
              تقدمك في المادة
            </div>

            <div className="big-progress-row">
              <strong>
                {statistics.progress}%
              </strong>

              <span>
                {statistics.completed} من{" "}
                {statistics.total} درس
              </span>
            </div>

            <div className="big-progress-bar">
              <span
                style={{
                  width: `${statistics.progress}%`,
                }}
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            STATS
        ===================================================== */}

        <section className="subject-stats">
          <div className="subject-info-card">
            <div className="stat-icon blue">
              <FaBook />
            </div>

            <div>
              <span>
                إجمالي الدروس
              </span>

              <strong>
                {statistics.total}
              </strong>

              <small>
                درس
              </small>
            </div>
          </div>

          <div className="subject-info-card">
            <div className="stat-icon green">
              <FaCheckCircle />
            </div>

            <div>
              <span>
                الدروس المكتملة
              </span>

              <strong>
                {statistics.completed}
              </strong>

              <small>
                درس
              </small>
            </div>
          </div>

          <div className="subject-info-card">
            <div className="stat-icon orange">
              <FaClipboardCheck />
            </div>

            <div>
              <span>
                الاختبارات المسجلة
              </span>

              <strong>
                {statistics.exams}
              </strong>

              <small>
                اختبار مع المدرس
              </small>
            </div>
          </div>

          <div className="subject-info-card">
            <div className="stat-icon purple">
              <FaTrophy />
            </div>

            <div>
              <span>
                متوسط النتائج
              </span>

              <strong>
                {statistics.exams
                  ? `${statistics.average}%`
                  : "--"}
              </strong>

              <small>
                من الاختبارات المسجلة
              </small>
            </div>
          </div>
        </section>

        {/* =====================================================
            TABS
        ===================================================== */}

        <nav className="subject-tabs">
          <button
            className={
              activeTab === "lessons"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "lessons"
              )
            }
          >
            <FaBook />
            المنهج
          </button>

          <button
            className={
              activeTab === "review"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "review"
              )
            }
          >
            <FaRedo />
            المراجعة المقترحة

            {statistics.reviewCount >
              0 && (
              <span className="tab-badge">
                {
                  statistics.reviewCount
                }
              </span>
            )}
          </button>

          <button
            className={
              activeTab ===
              "statistics"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab(
                "statistics"
              )
            }
          >
            <FaGraduationCap />
            إحصائيات المادة
          </button>
        </nav>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <section className="subject-content">
          {/* ===================================================
              SIDEBAR
          ==================================================== */}

          <aside className="subject-sidebar">
            {/* SUMMARY */}

            <div className="sidebar-card">
              <div className="sidebar-card-title">
                <FaBook />

                <h2>
                  ملخص المادة
                </h2>
              </div>

              <div className="sidebar-progress">
                <div className="sidebar-progress-circle">
                  <strong>
                    {statistics.progress}%
                  </strong>
                </div>

                <div>
                  <strong>
                    {statistics.completed}
                  </strong>

                  <span>
                    درس مكتمل
                  </span>
                </div>
              </div>

              <div className="mini-stat-row">
                <span>
                  متبقي
                </span>

                <strong>
                  {statistics.remaining}
                </strong>
              </div>

              <div className="mini-stat-row">
                <span>
                  اختبارات مسجلة
                </span>

                <strong>
                  {statistics.exams}
                </strong>
              </div>
            </div>

            {/* REVIEW */}

            <div className="sidebar-card">
              <div className="sidebar-card-title">
                <FaExclamationTriangle />

                <h2>
                  تحتاج مراجعة
                </h2>
              </div>

              {reviewLessons.length ===
              0 ? (
                <div className="no-review">
                  <FaCheckCircle />

                  <span>
                    ممتاز! لا توجد
                    دروس تحتاج مراجعة
                    حالياً.
                  </span>
                </div>
              ) : (
                <div className="review-mini-list">
                  {reviewLessons
                    .slice(0, 5)
                    .map(
                      (lesson) => {
                        const percentage =
                          lesson.score !==
                            null &&
                          lesson.total
                            ? Math.round(
                                (lesson.score /
                                  lesson.total) *
                                  100
                              )
                            : 0;

                        const review =
                          lesson.score !==
                            null &&
                          lesson.total
                            ? getReviewInfo(
                                lesson.score,
                                lesson.total
                              )
                            : {
                                type: "soon",
                                label:
                                  "مراجعة مستحقة",
                              };

                        return (
                          <div
                            className="review-mini-item"
                            key={`${lesson.id}-${lesson.review?.id || "score"}`}
                          >
                            <div>
                              <strong>
                                {
                                  lesson.title
                                }
                              </strong>

                              <small>
                                {lesson.score !==
                                  null &&
                                lesson.total
                                  ? `${lesson.score}/${lesson.total}`
                                  : "مراجعة مستحقة"}

                                {lesson.review
                                  ?.scheduled_at && (
                                  <>
                                    {" • "}
                                    {formatReviewDate(
                                      lesson
                                        .review
                                        .scheduled_at
                                    )}
                                  </>
                                )}
                              </small>
                            </div>

                            <span
                              className={`review-pill ${review.type}`}
                            >
                              {percentage}%
                            </span>
                          </div>
                        );
                      }
                    )}
                </div>
              )}
            </div>

            {/* LEGEND */}

            <div className="sidebar-card">
              <div className="sidebar-card-title">
                <FaStar />

                <h2>
                  طريقة تحديد المراجعة
                </h2>
              </div>

              <div className="review-rules">
                <div>
                  <span className="rule-dot urgent" />

                  أقل من 50%

                  <strong>
                    عاجل
                  </strong>
                </div>

                <div>
                  <span className="rule-dot soon" />

                  50% - 69%

                  <strong>
                    يحتاج مراجعة
                  </strong>
                </div>

                <div>
                  <span className="rule-dot normal" />

                  70% - 84%

                  <strong>
                    مراجعة قريبة
                  </strong>
                </div>

                <div>
                  <span className="rule-dot good" />

                  85% فأكثر

                  <strong>
                    جيد
                  </strong>
                </div>
              </div>
            </div>
          </aside>

          {/* ===================================================
              MAIN
          ==================================================== */}

          <div className="curriculum-section">
            {/* =================================================
                LESSONS TAB
            ================================================== */}

            {activeTab ===
              "lessons" && (
              <>
                <div className="curriculum-toolbar">
                  <div>
                    <h2>
                      دروس المادة
                    </h2>

                    <p>
                      علّم الدرس عند
                      الانتهاء من
                      مذاكرته، وسجل
                      نتيجتك إذا
                      اختبرت عليه.
                    </p>
                  </div>

                  <div className="toolbar-actions">
                    <button
                      onClick={
                        openAllUnits
                      }
                    >
                      فتح الكل
                    </button>

                    <button
                      onClick={
                        closeAllUnits
                      }
                    >
                      غلق الكل
                    </button>
                  </div>
                </div>

                {/* =================================================
                    UNITS
                ================================================== */}

                <div className="units-list">
                  {units.length ===
                  0 ? (
                    <div className="empty-state">
                      <div>
                        <FaBook />
                      </div>

                      <h3>
                        لا توجد دروس
                      </h3>

                      <p>
                        لم يتم إضافة
                        منهج لهذه المادة
                        بعد.
                      </p>
                    </div>
                  ) : (
                    units.map(
                      (unit) => {
                        const isOpen =
                          openUnits.includes(
                            unit.id
                          );

                        /*
                          الدروس المباشرة
                          داخل الوحدة
                        */

                        const directLessons =
                          allLessons.filter(
                            (lesson) =>
                              lesson.unitId ===
                                unit.id &&
                              !lesson.parentUnitId
                          );

                        /*
                          كل الدروس
                          المباشرة + الفرعية
                        */

                        const allUnitLessons =
                          allLessons.filter(
                            (lesson) => {
                              if (
                                lesson.unitId ===
                                unit.id
                              ) {
                                return true;
                              }

                              return (
                                lesson.parentUnitId ===
                                unit.id
                              );
                            }
                          );

                        const completedCount =
                          allUnitLessons.filter(
                            (lesson) =>
                              lesson.completed
                          ).length;

                        const unitProgress =
                          allUnitLessons.length >
                          0
                            ? Math.round(
                                (completedCount /
                                  allUnitLessons.length) *
                                  100
                              )
                            : 0;

                        return (
                          <article
                            className={`unit-card ${
                              isOpen
                                ? "open"
                                : ""
                            }`}
                            key={unit.id}
                          >
                            {/* UNIT HEADER */}

                            <button
                              className="unit-header"
                              onClick={() =>
                                toggleUnit(
                                  unit.id
                                )
                              }
                            >
                              <div className="unit-arrow">
                                {isOpen ? (
                                  <FaChevronUp />
                                ) : (
                                  <FaChevronDown />
                                )}
                              </div>

                              <div className="unit-number">
                                {
                                  unit.unitNumber
                                }
                              </div>

                              <div className="unit-info">
                                <h2>
                                  {
                                    unit.title
                                  }
                                </h2>

                                <div className="unit-meta">
                                  <span>
                                    {
                                      completedCount
                                    }{" "}
                                    من{" "}
                                    {
                                      allUnitLessons.length
                                    }{" "}
                                    دروس
                                  </span>

                                  <div className="unit-progress">
                                    <span
                                      style={{
                                        width: `${unitProgress}%`,
                                      }}
                                    />
                                  </div>

                                  <strong>
                                    {
                                      unitProgress
                                    }
                                    %
                                  </strong>
                                </div>
                              </div>
                            </button>

                            {/* =================================================
                                UNIT CONTENT
                            ================================================== */}

                            {isOpen && (
                              <div className="lessons-list">
                                {/* =================================================
                                    DIRECT LESSONS
                                ================================================== */}

                                {directLessons.map(
                                  (
                                    lesson
                                  ) => {
                                    return (
                                      <LessonRow
                                        key={
                                          lesson.id
                                        }
                                        lesson={
                                          lesson
                                        }
                                        fullLesson={
                                          lesson
                                        }
                                        latestReviewMap={
                                          latestReviewMap
                                        }
                                        onToggle={
                                          toggleLesson
                                        }
                                        onExam={
                                          openExamModal
                                        }
                                      />
                                    );
                                  }
                                )}
                              {/* =================================================
                                  CHILD UNITS
                              ================================================== */}
                              {unit.childUnits?.map((childUnit) => {
                                const isChildOpen = openUnits.includes(
                                  childUnit.id
                                );

                                const childLessons = allLessons.filter(
                                  (lesson) =>
                                    lesson.unitId === childUnit.id
                                );

                                const childCompleted =
                                  childLessons.filter(
                                    (lesson) => lesson.completed
                                  ).length;

                                const childProgress =
                                  childLessons.length > 0
                                    ? Math.round(
                                        (childCompleted /
                                          childLessons.length) *
                                          100
                                      )
                                    : 0;

                                return (
                                  <article
                                    className={`unit-card child-unit-card ${
                                      isChildOpen ? "open" : ""
                                    }`}
                                    key={childUnit.id}
                                  >
                                    {/* =========================================
                                        CHILD UNIT HEADER
                                    ========================================== */}

                                    <button
                                      type="button"
                                      className="unit-header"
                                      onClick={() =>
                                        toggleChildUnit(childUnit.id)
                                      }
                                    >
                                      <div className="unit-arrow">
                                        {isChildOpen ? (
                                          <FaChevronUp />
                                        ) : (
                                          <FaChevronDown />
                                        )}
                                      </div>

                                      <div className="unit-number">
                                        {childUnit.unitNumber}
                                      </div>

                                      <div className="unit-info">
                                        <h2>{childUnit.title}</h2>

                                        <div className="unit-meta">
                                          <span>
                                            {childCompleted} من{" "}
                                            {childLessons.length} دروس
                                          </span>

                                          <div className="unit-progress">
                                            <span
                                              style={{
                                                width: `${childProgress}%`,
                                              }}
                                            />
                                          </div>

                                          <strong>
                                            {childProgress}%
                                          </strong>
                                        </div>
                                      </div>
                                    </button>

                                    {/* =========================================
                                        CHILD UNIT LESSONS
                                    ========================================== */}

                                    {isChildOpen && (
                                      <div className="lessons-list child-lessons-list">
                                        {childLessons.map((lesson) => (
                                          <LessonRow
                                            key={lesson.id}
                                            lesson={lesson}
                                            fullLesson={lesson}
                                            latestReviewMap={
                                              latestReviewMap
                                            }
                                            onToggle={toggleLesson}
                                            onExam={openExamModal}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </article>
                                );
                              })}
                              </div>
                            )}
                          </article>
                        );
                      }
                    )
                  )}
                </div>
              </>
            )}

            {/* =================================================
                REVIEW TAB
            ================================================== */}

            {activeTab ===
              "review" && (
              <div className="tab-content-card">
                <div className="tab-content-header">
                  <div>
                    <h2>
                      المراجعة المقترحة
                    </h2>

                    <p>
                      المراجعات التي حان
                      موعدها أو تأخرت،
                      مع ترتيب الدروس
                      الأضعف أولًا.
                    </p>
                  </div>

                  <div className="review-count-large">
                    {
                      reviewLessons.length
                    }
                  </div>
                </div>

                {reviewLessons.length ===
                0 ? (
                  <div className="empty-state">
                    <div>
                      <FaCheckCircle />
                    </div>

                    <h3>
                      مفيش دروس تحتاج
                      مراجعة
                    </h3>

                    <p>
                      مفيش مراجعات مستحقة
                      حاليًا.
                    </p>
                  </div>
                ) : (
                  <div className="review-full-list">
                    {reviewLessons.map(
                      (
                        lesson,
                        index
                      ) => {
                        const percentage =
                          lesson.score !==
                            null &&
                          lesson.total
                            ? Math.round(
                                (lesson.score /
                                  lesson.total) *
                                  100
                              )
                            : 0;

                        const review =
                          lesson.score !==
                            null &&
                          lesson.total
                            ? getReviewInfo(
                                lesson.score,
                                lesson.total
                              )
                            : {
                                type: "soon",
                                label:
                                  "مراجعة مستحقة",
                              };

                        const reviewStatus =
                          getReviewDateStatus(
                            lesson.review
                          );

                        return (
                          <div
                            className="review-full-item"
                            key={`${lesson.id}-${lesson.review?.id || "review"}`}
                          >
                            <div className="review-rank">
                              {
                                index +
                                1
                              }
                            </div>

                            <div className="review-full-info">
                              <strong>
                                {
                                  lesson.title
                                }
                              </strong>

                              <span>
                                {
                                  lesson.unitTitle
                                }
                              </span>

                              {lesson.review
                                ?.scheduled_at && (
                                <small>
                                  موعد المراجعة:{" "}
                                  {formatReviewDate(
                                    lesson
                                      .review
                                      .scheduled_at
                                  )}
                                </small>
                              )}
                            </div>

                            <div className="review-full-score">
                              {lesson.score !==
                                null &&
                              lesson.total ? (
                                <>
                                  <strong>
                                    {
                                      lesson.score
                                    }
                                    /
                                    {
                                      lesson.total
                                    }
                                  </strong>

                                  <span>
                                    {
                                      percentage
                                    }
                                    %
                                  </span>
                                </>
                              ) : (
                                <span>
                                  مراجعة
                                </span>
                              )}
                            </div>

                            <span
                              className={`review-status ${
                                reviewStatus?.type ===
                                "overdue"
                                  ? "urgent"
                                  : review.type
                              }`}
                            >
                              {
                                reviewStatus?.label ||
                                review.label
                              }
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =================================================
                STATISTICS TAB
            ================================================== */}

            {activeTab ===
              "statistics" && (
              <div className="statistics-grid">
                <div className="big-stat-card">
                  <div className="big-stat-icon blue">
                    <FaBook />
                  </div>

                  <span>
                    تقدم المنهج
                  </span>

                  <strong>
                    {
                      statistics.progress
                    }
                    %
                  </strong>

                  <div className="big-stat-bar">
                    <span
                      style={{
                        width: `${statistics.progress}%`,
                      }}
                    />
                  </div>

                  <small>
                    {
                      statistics.completed
                    }{" "}
                    من{" "}
                    {
                      statistics.total
                    }{" "}
                    درس
                  </small>
                </div>

                <div className="big-stat-card">
                  <div className="big-stat-icon green">
                    <FaClipboardCheck />
                  </div>

                  <span>
                    الاختبارات المسجلة
                  </span>

                  <strong>
                    {
                      statistics.exams
                    }
                  </strong>

                  <small>
                    اختبارات مع المدرس
                  </small>
                </div>

                <div className="big-stat-card">
                  <div className="big-stat-icon orange">
                    <FaTrophy />
                  </div>

                  <span>
                    متوسط النتائج
                  </span>

                  <strong>
                    {statistics.exams
                      ? `${statistics.average}%`
                      : "--"}
                  </strong>

                  <small>
                    من جميع الاختبارات
                    المسجلة
                  </small>
                </div>

                <div className="big-stat-card">
                  <div className="big-stat-icon red">
                    <FaExclamationTriangle />
                  </div>

                  <span>
                    تحتاج مراجعة
                  </span>

                  <strong>
                    {
                      statistics.reviewCount
                    }
                  </strong>

                  <small>
                    مراجعات مستحقة حاليًا
                  </small>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* =======================================================
          EXAM MODAL
      ======================================================== */}

      {showExamModal &&
        selectedLesson && (
          <div className="exam-modal-overlay">
            <div className="exam-modal">
              <button
                className="modal-close"
                onClick={() => {
                  if (!saving) {
                    setShowExamModal(
                      false
                    );

                    setSelectedLesson(
                      null
                    );
                  }
                }}
              >
                <FaTimes />
              </button>

              <div className="modal-icon">
                <FaClipboardCheck />
              </div>

              <h2>
                تسجيل نتيجة الاختبار
              </h2>

              <p>
                {
                  selectedLesson.title
                }
              </p>

              <div className="exam-inputs">
                <div className="exam-input-group">
                  <label>
                    الدرجة التي حصلت
                    عليها
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      examScore
                    }
                    onChange={(e) =>
                      setExamScore(
                        e.target.value
                      )
                    }
                    placeholder="مثال: 7"
                    disabled={saving}
                  />
                </div>

                <span className="exam-slash">
                  /
                </span>

                <div className="exam-input-group">
                  <label>
                    الدرجة النهائية
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      examTotal
                    }
                    onChange={(e) =>
                      setExamTotal(
                        e.target.value
                      )
                    }
                    placeholder="مثال: 10"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="modal-hint">
                مثال: لو جبت{" "}
                <strong>
                  7 / 10
                </strong>{" "}
                والنظام هيحسب مستوى
                الدرس تلقائيًا.
              </div>

              <div className="modal-actions">
                <button
                  className="save-exam-button"
                  onClick={
                    saveExam
                  }
                  disabled={saving}
                >
                  <FaCheck />

                  {saving
                    ? "جاري الحفظ..."
                    : "حفظ النتيجة"}
                </button>

                {latestStudyMap[
                  selectedLesson.id
                ]?.score !== null &&
                  latestStudyMap[
                    selectedLesson.id
                  ]?.score !==
                    undefined && (
                    <button
                      className="delete-exam-button"
                      onClick={
                        removeExam
                      }
                      disabled={
                        saving
                      }
                    >
                      حذف النتيجة
                    </button>
                  )}
              </div>
            </div>
          </div>
        )}
    </>
  );
};

/* =========================================================
   LESSON ROW
========================================================= */

const LessonRow = ({
  lesson,
  fullLesson,
  latestReviewMap,
  onToggle,
  onExam,
}) => {
  const hasExam =
    fullLesson?.score !==
      null &&
    fullLesson?.score !==
      undefined &&
    fullLesson?.total !==
      null &&
    fullLesson?.total !==
      undefined &&
    fullLesson?.total > 0;

  const percentage = hasExam
    ? Math.round(
        (fullLesson.score /
          fullLesson.total) *
          100
      )
    : null;

  const review = hasExam
    ? getReviewInfo(
        fullLesson.score,
        fullLesson.total
      )
    : null;

  const lessonReview =
    latestReviewMap[
      lesson.id
    ] || null;

  const reviewDateStatus =
    getReviewDateStatus(
      lessonReview
    );

  return (
    <div
      className={`subject-lesson-row ${
        fullLesson?.completed
          ? "completed"
          : ""
      }`}
    >
      {/* COMPLETE */}

      <button
        className={`subject-lesson-check ${
          fullLesson?.completed
            ? "checked"
            : ""
        }`}
        onClick={() =>
          onToggle(fullLesson)
        }
        title={
          fullLesson?.completed
            ? "إلغاء إكمال الدرس"
            : "تحديد الدرس كمكتمل"
        }
      >
        {fullLesson?.completed && (
          <FaCheck />
        )}
      </button>

      {/* NAME */}

      <div className="subject-lesson-info">
        <span className="subject-lesson-number">
          {
            lesson.lessonNumber
          }
        </span>

        <div>
          <strong>
            {lesson.title}
          </strong>

          <small>
            {fullLesson?.completed
              ? "تمت مذاكرته"
              : "لم تتم مذاكرته بعد"}
          </small>
        </div>
      </div>

      {/* EXAM */}

      <div className="subject-lesson-exam">
        {hasExam ? (
          <div className="subject-lesson-score">
            <button
              className={`subject-score-box ${review.type}`}
              onClick={() =>
                onExam(
                  fullLesson
                )
              }
            >
              <strong>
                {
                  fullLesson.score
                }
              </strong>

              <span>
                /
                {
                  fullLesson.total
                }
              </span>
            </button>

            <span
              className={`subject-score-label ${review.type}`}
            >
              {percentage}%
            </span>
          </div>
        ) : (
          <button
            className="subject-add-exam-button"
            onClick={() =>
              onExam(
                fullLesson
              )
            }
          >
            <FaClipboardCheck />
            تسجيل اختبار
          </button>
        )}
      </div>

      {/* REVIEW */}

      <div className="subject-lesson-review">
        {reviewDateStatus ? (
          <span
            className={`subject-review-status ${
              reviewDateStatus.type ===
              "overdue"
                ? "urgent"
                : reviewDateStatus.type ===
                    "today"
                  ? "soon"
                  : reviewDateStatus.type ===
                      "completed"
                    ? "good"
                    : "normal"
            }`}
            title={
              lessonReview?.scheduled_at
                ? `موعد المراجعة: ${formatReviewDate(
                    lessonReview.scheduled_at
                  )}`
                : ""
            }
          >
            {reviewDateStatus.type ===
              "overdue" && (
              <FaExclamationTriangle />
            )}

            {reviewDateStatus.type ===
              "today" && (
              <FaRedo />
            )}

            {reviewDateStatus.type ===
              "upcoming" && (
              <FaClock />
            )}

            {reviewDateStatus.type ===
              "completed" && (
              <FaCheckCircle />
            )}

            {
              reviewDateStatus.label
            }
          </span>
        ) : review ? (
          <span
            className={`subject-review-status ${review.type}`}
          >
            {review.type ===
              "urgent" && (
              <FaExclamationTriangle />
            )}

            {review.type ===
              "soon" && (
              <FaRedo />
            )}

            {review.type ===
              "normal" && (
              <FaClock />
            )}

            {review.type ===
              "good" && (
              <FaCheckCircle />
            )}

            {review.label}
          </span>
        ) : (
          <span className="subject-no-score">
            لا توجد مراجعة
          </span>
        )}
      </div>
    </div>
  );
};

export default SubjectDetails;