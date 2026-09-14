import React, { useEffect, useMemo, useState } from "react";
import {
  FaFilter,
  FaEllipsisH,
  FaBook,
  FaFlask,
  FaAtom,
  FaCalculator,
  FaGlobeAmericas,
  FaBrain,
  FaLanguage,
  FaClock,
  FaArrowLeft,
  FaExclamationTriangle,
  FaChartLine,
  FaFileAlt,
  FaCheckCircle,
  FaChevronDown,
  FaLeaf,
} from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import { supabase } from "../../utils/supabaseClient";
import "./Subjects.css";

const Subjects = () => {
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] =
    useState("كل المواد");

  const [sortBy, setSortBy] =
    useState("حسب التقدم");

  const [studentSection, setStudentSection] =
    useState("");

  const [gradeLevel, setGradeLevel] =
    useState("");

  const [educationSystem, setEducationSystem] =
    useState("");

  const [studentTrack, setStudentTrack] =
    useState("");

  const [subjectsData, setSubjectsData] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  /*
   * =====================================================
   * EDUCATION INFO
   * =====================================================
   */

  const gradeLabels = {
    first_secondary: "أولى ثانوي",
    second_secondary: "تانية ثانوي",
    third_secondary: "تالتة ثانوي",
  };

  const systemLabels = {
    general: "النظام العام",
    baccalaureate: "البكالوريا المصرية",
  };

  const trackLabels = {
    medicine_life: "الطب وعلوم الحياة",
    engineering_cs: "الهندسة وعلوم الحاسب",
    business: "الأعمال",
    arts: "الآداب والفنون",
  };

  const getGradeLabel = (value) => {
    return gradeLabels[value] || "-";
  };

  const getSystemLabel = (value) => {
    return systemLabels[value] || "-";
  };

  const getTrackLabel = (value) => {
    return trackLabels[value] || "";
  };

  /*
   * =====================================================
   * SUBJECT ICON
   * =====================================================
   */

  const getSubjectIcon = (subject) => {
    const name = subject?.name || "";
    const type = subject?.type || "";
    const iconType = subject?.icon_class || "";

    if (
      name.includes("كيمياء") ||
      type === "chemistry" ||
      iconType === "chemistry"
    ) {
      return {
        icon: <FaFlask />,
        iconType: "chemistry",
      };
    }

    if (
      name.includes("فيزياء") ||
      type === "physics" ||
      iconType === "physics"
    ) {
      return {
        icon: <FaAtom />,
        iconType: "physics",
      };
    }

    if (
      name.includes("رياضيات") ||
      type === "math" ||
      iconType === "math"
    ) {
      return {
        icon: <FaCalculator />,
        iconType: "math",
      };
    }

    if (
      name.includes("إنجليزي") ||
      name.includes("الإنجليزي") ||
      name.includes("لغة إنجليزية") ||
      type === "english" ||
      iconType === "english"
    ) {
      return {
        icon: <FaLanguage />,
        iconType: "english",
      };
    }

    if (
      name.includes("عربي") ||
      name.includes("العربي") ||
      name.includes("اللغة العربية") ||
      type === "arabic" ||
      iconType === "arabic"
    ) {
      return {
        icon: <FaBook />,
        iconType: "arabic",
      };
    }

    if (
      name.includes("أحياء") ||
      name.includes("الأحياء") ||
      type === "biology" ||
      iconType === "biology"
    ) {
      return {
        icon: <FaLeaf />,
        iconType: "biology",
      };
    }

    if (
      name.includes("جيولوجيا") ||
      name.includes("الجيولوجيا") ||
      type === "geology" ||
      iconType === "geology"
    ) {
      return {
        icon: <FaGlobeAmericas />,
        iconType: "geology",
      };
    }

    if (
      name.includes("فلسفة") ||
      name.includes("الفلسفة") ||
      type === "philosophy" ||
      iconType === "philosophy"
    ) {
      return {
        icon: <FaBrain />,
        iconType: "philosophy",
      };
    }

    return {
      icon: <FaBook />,
      iconType: "default",
    };
  };

  /*
   * =====================================================
   * FORMAT STUDY TIME
   * =====================================================
   */

  const formatStudyTime = (minutes) => {
    const totalMinutes =
      Number(minutes) || 0;

    const hours = Math.floor(
      totalMinutes / 60
    );

    const remainingMinutes =
      totalMinutes % 60;

    return `${hours} س ${remainingMinutes} د`;
  };

  /*
   * =====================================================
   * STATUS
   * =====================================================
   */

  const getSubjectStatus = (progress) => {
    if (progress < 40) {
      return {
        status: "يحتاج اهتمام",
        statusType: "danger",
      };
    }

    if (progress < 60) {
      return {
        status: "متوسط",
        statusType: "medium",
      };
    }

    if (progress < 80) {
      return {
        status: "يحتاج اهتمام",
        statusType: "attention",
      };
    }

    if (progress >= 80) {
      return {
        status: "ممتاز",
        statusType: "excellent",
      };
    }

    return {
      status: "متوسط",
      statusType: "medium",
    };
  };

  /*
   * =====================================================
   * GET STUDENT + SUBJECTS DATA
   * =====================================================
   */

  useEffect(() => {
    const fetchSubjectsData = async () => {
      try {
        setLoading(true);

        /*
         * -------------------------------------------------
         * 1. GET AUTH USER
         * -------------------------------------------------
         */

        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const user = authData?.user;

        if (!user) {
          throw new Error(
            "لم يتم العثور على المستخدم"
          );
        }

        /*
         * -------------------------------------------------
         * 2. GET STUDENT PROFILE
         * -------------------------------------------------
         */

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("student_profiles")
          .select(`
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

        const currentSection =
          profileData.section || "";

        const currentGradeLevel =
          profileData.grade_level ||
          "third_secondary";

        const currentEducationSystem =
          profileData.education_system ||
          "general";

        const currentTrack =
          profileData.track || "";

        setStudentSection(currentSection);
        setGradeLevel(currentGradeLevel);
        setEducationSystem(
          currentEducationSystem
        );
        setStudentTrack(currentTrack);

        /*
         * =================================================
         * FIRST + SECOND SECONDARY
         * =================================================
         */

        if (
          currentGradeLevel ===
            "first_secondary" ||
          currentGradeLevel ===
            "second_secondary"
        ) {
          /*
           * -------------------------------------------------
           * 3. GET CURRICULUM ACCESS
           * -------------------------------------------------
           */

          let accessQuery = supabase
            .from("subject_curriculum_access")
            .select(`
              subject_id,
              grade_level,
              education_system,
              track
            `)
            .eq(
              "grade_level",
              currentGradeLevel
            )
            .eq(
              "education_system",
              currentEducationSystem
            );

          /*
           * بكالوريا:
           *
           * أولى بكالوريا:
           * track = NULL لأنها سنة تمهيدية.
           *
           * تانية بكالوريا:
           * track يحتوي على المسار.
           */

          if (
            currentEducationSystem ===
            "baccalaureate"
          ) {
            if (
              currentGradeLevel ===
                "first_secondary" ||
              !currentTrack
            ) {
              accessQuery =
                accessQuery.is(
                  "track",
                  null
                );
            } else {
              accessQuery =
                accessQuery.eq(
                  "track",
                  currentTrack
                );
            }
          }

          /*
           * النظام العام:
           * track لازم يكون NULL
           */

          if (
            currentEducationSystem ===
            "general"
          ) {
            accessQuery =
              accessQuery.is(
                "track",
                null
              );
          }

          const {
            data: curriculumAccess,
            error:
              curriculumAccessError,
          } = await accessQuery;

          if (curriculumAccessError) {
            throw curriculumAccessError;
          }

          /*
           * -------------------------------------------------
           * 4. GET SUBJECT IDS
           * -------------------------------------------------
           */

          const subjectIds = [
            ...new Set(
              (
                curriculumAccess || []
              )
                .map(
                  (item) =>
                    item.subject_id
                )
                .filter(Boolean)
            ),
          ];

          if (!subjectIds.length) {
            setSubjectsData([]);
            return;
          }

          /*
           * -------------------------------------------------
           * 5. GET ACTIVE SUBJECTS
           * -------------------------------------------------
           */

          const {
            data: subjects,
            error: subjectsError,
          } = await supabase
            .from("subjects")
            .select(`
              id,
              name,
              slug,
              subtitle,
              icon,
              icon_class,
              type,
              is_active
            `)
            .in(
              "id",
              subjectIds
            )
            .eq(
              "is_active",
              true
            )
            .order("name", {
              ascending: true,
            });

          if (subjectsError) {
            throw subjectsError;
          }

          if (!subjects?.length) {
            setSubjectsData([]);
            return;
          }

          /*
           * -------------------------------------------------
           * 6. GET NEW CURRICULUM
           * -------------------------------------------------
           *
           * units
           *   └── lessons
           *
           * ملاحظة:
           * بعض الـ units تعتبر parent units
           * وممكن ما يكونش فيها lessons مباشرة.
           *
           * لذلك هنحسب الدروس الفعلية فقط.
           */

          const {
            data: units,
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
                title,
                sort_order,
                is_active
              )
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

          if (unitsError) {
            throw unitsError;
          }

          /*
           * -------------------------------------------------
           * 7. BUILD LESSONS BY SUBJECT
           * -------------------------------------------------
           */

          const lessonsBySubject =
            new Map();

          (
            units || []
          ).forEach((unit) => {
            const subjectId =
              unit.subject_id;

            if (!subjectId) {
              return;
            }

            if (
              !lessonsBySubject.has(
                subjectId
              )
            ) {
              lessonsBySubject.set(
                subjectId,
                []
              );
            }

            const lessons =
              Array.isArray(
                unit.lessons
              )
                ? unit.lessons
                : [];

            lessons
              .filter(
                (lesson) =>
                  lesson &&
                  lesson.is_active !==
                    false
              )
              .forEach(
                (lesson) => {
                  lessonsBySubject
                    .get(
                      subjectId
                    )
                    .push({
                      ...lesson,
                      unitId:
                        unit.id,
                      unitTitle:
                        unit.title,
                    });
                }
              );
          });

          /*
           * -------------------------------------------------
           * 8. GET ALL CURRICULUM LESSON IDS
           * -------------------------------------------------
           */

          const allLessonIds = [];

          lessonsBySubject.forEach(
            (lessons) => {
              lessons.forEach(
                (lesson) => {
                  if (lesson.id) {
                    allLessonIds.push(
                      lesson.id
                    );
                  }
                }
              );
            }
          );

          /*
           * -------------------------------------------------
           * 9. GET STUDY RECORDS
           * -------------------------------------------------
           *
           * مهم:
           * المناهج الجديدة تستخدم:
           *
           * curriculum_lesson_id
           * curriculum_unit_id
           */

          let studyRecords = [];

          if (
            allLessonIds.length
          ) {
            const {
              data: studies,
              error: studiesError,
            } = await supabase
              .from(
                "student_lesson_study"
              )
              .select(`
                id,
                subject_id,
                curriculum_lesson_id,
                curriculum_unit_id,
                study_minutes,
                score,
                studied_at,
                created_at
              `)
              .eq(
                "user_id",
                user.id
              )
              .in(
                "curriculum_lesson_id",
                allLessonIds
              )
              .order(
                "studied_at",
                {
                  ascending: false,
                }
              );

            if (studiesError) {
              throw studiesError;
            }

            studyRecords =
              studies || [];
          }

          /*
           * -------------------------------------------------
           * 10. LATEST STUDY PER LESSON
           * -------------------------------------------------
           */

          const latestStudyByLesson =
            new Map();

          studyRecords.forEach(
            (study) => {
              const lessonId =
                study.curriculum_lesson_id;

              if (!lessonId) {
                return;
              }

              if (
                !latestStudyByLesson.has(
                  lessonId
                )
              ) {
                latestStudyByLesson.set(
                  lessonId,
                  study
                );
              }
            }
          );

          /*
           * -------------------------------------------------
           * 11. FORMAT SUBJECTS
           * -------------------------------------------------
           */

          const formattedSubjects =
            subjects.map(
              (subject) => {
                const subjectLessons =
                  lessonsBySubject.get(
                    subject.id
                  ) || [];

                /*
                 * كل lessons الفعلية
                 */

                const totalLessons =
                  subjectLessons.length;

                /*
                 * الدروس المكتملة:
                 * نفس منطق الصفحة الحالي:
                 *
                 * study_minutes > 0
                 */

                const completedLessons =
                  subjectLessons.filter(
                    (lesson) => {
                      const study =
                        latestStudyByLesson.get(
                          lesson.id
                        );

                      return (
                        study &&
                        Number(
                          study.study_minutes ||
                            0
                        ) > 0
                      );
                    }
                  ).length;

                /*
                 * PROGRESS
                 */

                const progress =
                  totalLessons
                    ? Math.round(
                        (completedLessons /
                          totalLessons) *
                          100
                      )
                    : 0;

                /*
                 * TOTAL STUDY MINUTES
                 */

                const totalStudyMinutes =
                  subjectLessons.reduce(
                    (
                      total,
                      lesson
                    ) => {
                      const study =
                        latestStudyByLesson.get(
                          lesson.id
                        );

                      if (!study) {
                        return total;
                      }

                      return (
                        total +
                        Number(
                          study.study_minutes ||
                            0
                        )
                      );
                    },
                    0
                  );

                /*
                 * ICON
                 */

                const iconData =
                  getSubjectIcon(
                    subject
                  );

                /*
                 * STATUS
                 */

                const statusData =
                  getSubjectStatus(
                    progress
                  );

                return {
                  id: subject.id,
                  name: subject.name,
                  slug: subject.slug,

                  /*
                   * أولى وتانية:
                   * لا نعتمد على sections.
                   */
                  sections: [],

                  icon: iconData.icon,
                  iconType:
                    iconData.iconType,

                  progress,

                  completedLessons,

                  totalLessons,

                  studyMinutes:
                    totalStudyMinutes,

                  studyHours:
                    formatStudyTime(
                      totalStudyMinutes
                    ),

                  status:
                    statusData.status,

                  statusType:
                    statusData.statusType,
                };
              }
            );

          setSubjectsData(
            formattedSubjects
          );

          return;
        }

        /*
         * =================================================
         * THIRD SECONDARY
         * =================================================
         *
         * الكود التالي هو نفس منطق تالتة الحالي.
         */

        /*
         * -------------------------------------------------
         * 3. GET ALL ACTIVE SUBJECTS
         * -------------------------------------------------
         */

        const {
          data: subjects,
          error: subjectsError,
        } = await supabase
          .from("subjects")
          .select(`
            id,
            name,
            slug,
            subtitle,
            icon,
            icon_class,
            type,
            is_active
          `)
          .eq("is_active", true)
          .order("name", {
            ascending: true,
          });

        if (subjectsError) {
          throw subjectsError;
        }

        if (!subjects?.length) {
          setSubjectsData([]);
          return;
        }

        const subjectIds =
          subjects.map(
            (subject) =>
              subject.id
          );

        /*
         * -------------------------------------------------
         * 4. GET SUBJECT SECTIONS
         * -------------------------------------------------
         */

        const {
          data: subjectSections,
          error:
            subjectSectionsError,
        } = await supabase
          .from(
            "subject_sections"
          )
          .select(
            "subject_id, section_id"
          )
          .in(
            "subject_id",
            subjectIds
          );

        if (subjectSectionsError) {
          throw subjectSectionsError;
        }

        /*
         * -------------------------------------------------
         * 5. GET SECTIONS
         * -------------------------------------------------
         */

        const sectionIds = [
          ...new Set(
            (
              subjectSections || []
            )
              .map(
                (item) =>
                  item.section_id
              )
              .filter(Boolean)
          ),
        ];

        let sections = [];

        if (sectionIds.length) {
          const {
            data: sectionsData,
            error: sectionsError,
          } = await supabase
            .from("sections")
            .select(
              "id, name"
            )
            .in(
              "id",
              sectionIds
            );

          if (sectionsError) {
            throw sectionsError;
          }

          sections =
            sectionsData || [];
        }

        /*
         * -------------------------------------------------
         * 6. MAP SUBJECT SECTIONS
         * -------------------------------------------------
         */

        const sectionMap =
          new Map(
            sections.map(
              (section) => [
                section.id,
                section.name,
              ]
            )
          );

        const subjectSectionMap =
          new Map();

        (
          subjectSections || []
        ).forEach((item) => {
          const sectionName =
            sectionMap.get(
              item.section_id
            );

          if (!sectionName) {
            return;
          }

          if (
            !subjectSectionMap.has(
              item.subject_id
            )
          ) {
            subjectSectionMap.set(
              item.subject_id,
              []
            );
          }

          subjectSectionMap
            .get(
              item.subject_id
            )
            .push(sectionName);
        });

        /*
         * -------------------------------------------------
         * 7. GET OLD UNITS + LESSONS
         * -------------------------------------------------
         */

        const {
          data: units,
          error: unitsError,
        } = await supabase
          .from(
            "subject_units"
          )
          .select(`
            id,
            subject_id,
            subject_lessons (
              id,
              lesson_number,
              title,
              is_active
            )
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
            "unit_number",
            {
              ascending: true,
            }
          );

        if (unitsError) {
          throw unitsError;
        }

        /*
         * -------------------------------------------------
         * 8. BUILD LESSONS MAP
         * -------------------------------------------------
         */

        const lessonsBySubject =
          new Map();

        (
          units || []
        ).forEach((unit) => {
          const subjectId =
            unit.subject_id;

          if (
            !lessonsBySubject.has(
              subjectId
            )
          ) {
            lessonsBySubject.set(
              subjectId,
              []
            );
          }

          const lessons =
            Array.isArray(
              unit.subject_lessons
            )
              ? unit.subject_lessons
              : [];

          lessons
            .filter(
              (lesson) =>
                lesson.is_active !==
                false
            )
            .forEach(
              (lesson) => {
                lessonsBySubject
                  .get(
                    subjectId
                  )
                  .push(lesson);
              }
            );
        });

        /*
         * -------------------------------------------------
         * 9. GET STUDY RECORDS
         * -------------------------------------------------
         */

        const allLessonIds = [];

        lessonsBySubject.forEach(
          (lessons) => {
            lessons.forEach(
              (lesson) => {
                if (lesson.id) {
                  allLessonIds.push(
                    lesson.id
                  );
                }
              }
            );
          }
        );

        let studyRecords = [];

        if (allLessonIds.length) {
          const {
            data: studies,
            error: studiesError,
          } = await supabase
            .from(
              "student_lesson_study"
            )
            .select(`
              id,
              subject_id,
              lesson_id,
              study_minutes,
              score,
              studied_at,
              created_at
            `)
            .eq(
              "user_id",
              user.id
            )
            .in(
              "lesson_id",
              allLessonIds
            )
            .order(
              "studied_at",
              {
                ascending: false,
              }
            );

          if (studiesError) {
            throw studiesError;
          }

          studyRecords =
            studies || [];
        }

        /*
         * -------------------------------------------------
         * 10. LATEST STUDY PER LESSON
         * -------------------------------------------------
         */

        const latestStudyByLesson =
          new Map();

        studyRecords.forEach(
          (study) => {
            if (
              !latestStudyByLesson.has(
                study.lesson_id
              )
            ) {
              latestStudyByLesson.set(
                study.lesson_id,
                study
              );
            }
          }
        );

        /*
         * -------------------------------------------------
         * 11. FORMAT SUBJECTS
         * -------------------------------------------------
         */

        const formattedSubjects =
          subjects.map(
            (subject) => {
              const subjectLessons =
                lessonsBySubject.get(
                  subject.id
                ) || [];

              const totalLessons =
                subjectLessons.length;

              const completedLessons =
                subjectLessons.filter(
                  (lesson) => {
                    const study =
                      latestStudyByLesson.get(
                        lesson.id
                      );

                    return (
                      study &&
                      Number(
                        study.study_minutes ||
                          0
                      ) > 0
                    );
                  }
                ).length;

              const progress =
                totalLessons
                  ? Math.round(
                      (completedLessons /
                        totalLessons) *
                        100
                    )
                  : 0;

              /*
               * TOTAL STUDY MINUTES
               */

              const totalStudyMinutes =
                subjectLessons.reduce(
                  (
                    total,
                    lesson
                  ) => {
                    const study =
                      latestStudyByLesson.get(
                        lesson.id
                      );

                    if (!study) {
                      return total;
                    }

                    return (
                      total +
                      Number(
                        study.study_minutes ||
                          0
                      )
                    );
                  },
                  0
                );

              /*
               * SUBJECT SECTIONS
               */

              const sectionsForSubject =
                subjectSectionMap.get(
                  subject.id
                ) || [];

              /*
               * ICON
               */

              const iconData =
                getSubjectIcon(
                  subject
                );

              /*
               * STATUS
               */

              const statusData =
                getSubjectStatus(
                  progress
                );

              return {
                id: subject.id,
                name: subject.name,
                slug: subject.slug,
                sections:
                  sectionsForSubject,

                icon: iconData.icon,
                iconType:
                  iconData.iconType,

                progress,

                completedLessons,

                totalLessons,

                studyMinutes:
                  totalStudyMinutes,

                studyHours:
                  formatStudyTime(
                    totalStudyMinutes
                  ),

                status:
                  statusData.status,

                statusType:
                  statusData.statusType,
              };
            }
          );

        /*
         * -------------------------------------------------
         * 12. SAVE
         * -------------------------------------------------
         */

        setSubjectsData(
          formattedSubjects
        );
      } catch (error) {
        console.error(
          "Error fetching subjects:",
          error
        );

        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            error?.message ||
            "تعذر تحميل المواد الدراسية",
          confirmButtonText:
            "حسنًا",
        });

        setSubjectsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectsData();
  }, []);

  /*
   * =====================================================
   * IS NEW EDUCATION STAGE
   * =====================================================
   */

  const isNewSecondaryStage =
    gradeLevel ===
      "first_secondary" ||
    gradeLevel ===
      "second_secondary";

  /*
   * =====================================================
   * FILTER SUBJECTS BY STUDENT SECTION
   * =====================================================
   */

  const studentSubjects = useMemo(() => {
    /*
     * أولى وتانية:
     *
     * المواد تم تحديدها بالفعل
     * بواسطة subject_curriculum_access
     */

    if (isNewSecondaryStage) {
      return subjectsData;
    }

    /*
     * تالتة:
     *
     * نحافظ على الفلترة القديمة
     * حسب الشعبة.
     */

    if (!studentSection) {
      return [];
    }

    return subjectsData.filter(
      (subject) => {
        const sections =
          subject.sections || [];

        return (
          sections.includes(
            studentSection
          ) ||
          sections.includes(
            "مشترك"
          )
        );
      }
    );
  }, [
    studentSection,
    subjectsData,
    isNewSecondaryStage,
  ]);

  /*
   * =====================================================
   * CATEGORY FILTER
   * =====================================================
   */

  const filteredSubjects =
    useMemo(() => {
      let result = [
        ...studentSubjects,
      ];

      if (
        activeCategory ===
        "تحتاج اهتمام"
      ) {
        result =
          result.filter(
            (subject) =>
              subject.statusType ===
                "attention" ||
              subject.statusType ===
                "danger"
          );
      }

      if (
        activeCategory ===
        "ممتازة"
      ) {
        result =
          result.filter(
            (subject) =>
              subject.statusType ===
              "excellent"
          );
      }

      if (
        sortBy ===
        "حسب التقدم"
      ) {
        result.sort(
          (a, b) =>
            b.progress -
            a.progress
        );
      }

      if (
        sortBy ===
        "الأقل تقدمًا"
      ) {
        result.sort(
          (a, b) =>
            a.progress -
            b.progress
        );
      }

      if (
        sortBy ===
        "الأكثر تقدمًا"
      ) {
        result.sort(
          (a, b) =>
            b.progress -
            a.progress
        );
      }

      if (
        sortBy ===
        "الاسم"
      ) {
        result.sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
              "ar"
            )
        );
      }

      return result;
    }, [
      studentSubjects,
      activeCategory,
      sortBy,
    ]);

  /*
   * =====================================================
   * CALCULATED STATISTICS
   * =====================================================
   */

  const statistics = useMemo(() => {
    if (!studentSubjects.length) {
      return {
        attentionCount: 0,
        averageProgress: 0,
        completedSubjects: 0,
        totalSubjects: 0,
        totalHours: "0 س 0 د",
        lowestSubject: null,
        highestSubject: null,
        mostHoursSubject: null,
      };
    }

    const attentionCount =
      studentSubjects.filter(
        (subject) =>
          subject.statusType ===
            "attention" ||
          subject.statusType ===
            "danger"
      ).length;

    const averageProgress =
      Math.round(
        studentSubjects.reduce(
          (
            total,
            subject
          ) =>
            total +
            subject.progress,
          0
        ) /
          studentSubjects.length
      );

    const completedSubjects =
      studentSubjects.filter(
        (subject) =>
          subject.progress >= 80
      ).length;

    const lowestSubject = [
      ...studentSubjects,
    ].sort(
      (a, b) =>
        a.progress -
        b.progress
    )[0];

    const highestSubject = [
      ...studentSubjects,
    ].sort(
      (a, b) =>
        b.progress -
        a.progress
    )[0];

    const mostHoursSubject = [
      ...studentSubjects,
    ].sort(
      (a, b) =>
        b.studyMinutes -
        a.studyMinutes
    )[0];

    const totalMinutes =
      studentSubjects.reduce(
        (
          total,
          subject
        ) =>
          total +
          Number(
            subject.studyMinutes ||
              0
          ),
        0
      );

    const totalHours =
      Math.floor(
        totalMinutes / 60
      );

    const totalRemainingMinutes =
      totalMinutes % 60;

    return {
      attentionCount,
      averageProgress,
      completedSubjects,
      totalSubjects:
        studentSubjects.length,
      totalHours: `${totalHours} س ${totalRemainingMinutes} د`,
      lowestSubject,
      highestSubject,
      mostHoursSubject,
    };
  }, [studentSubjects]);

  /*
   * =====================================================
   * PROGRESS CLASS
   * =====================================================
   */

  const getProgressClass = (
    progress
  ) => {
    if (progress < 40) {
      return "progress-danger";
    }

    if (progress < 60) {
      return "progress-warning";
    }

    return "progress-success";
  };

  /*
   * =====================================================
   * OPEN SUBJECT
   * =====================================================
   */

  const handleOpenSubject = (
    subject
  ) => {
    if (!subject?.id) {
      return;
    }

    const identifier =
      subject.slug ||
      subject.id;

    navigate(
      `/subjects/${identifier}`
    );
  };

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <main className="subjects-page">
        <Header />

        <div className="page-loading">
          <div className="page-loading-spinner">
            <FiRefreshCw />
          </div>

          <h3>
            جاري تجهيز رحلتك الدراسية...
          </h3>

          <p>
            بنحمّل إحصائياتك وخطة اليوم.
          </p>
        </div>
      </main>
    );
  }

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <main className="subjects-page">
      <Header />

      {/* =====================================================
          STUDENT EDUCATION INFO
      ====================================================== */}

      <section className="subjects-section-info">
        <span>
          المرحلة الدراسية
        </span>

        <strong>
          {getGradeLabel(
            gradeLevel
          )}
        </strong>

        <span>
          النظام الدراسي
        </span>

        <strong>
          {getSystemLabel(
            educationSystem
          )}
        </strong>

        {gradeLevel ===
        "third_secondary" ? (
          <>
            <span>
              الشعبة الدراسية
            </span>

            <strong>
              {studentSection ||
                "-"}
            </strong>
          </>
        ) : educationSystem ===
            "baccalaureate" &&
          studentTrack ? (
          <>
            <span>
              المسار
            </span>

            <strong>
              {getTrackLabel(
                studentTrack
              )}
            </strong>
          </>
        ) : null}
      </section>

      {/* =====================================================
          TOP STATISTICS
      ====================================================== */}

      <section className="subjects-stats">
        {/* Attention */}

        <article className="subject-stat-card">
          <div className="subject-stat-icon purple">
            <FaChartLine />
          </div>

          <div className="subject-stat-content">
            <h3>
              المواد تحتاج اهتمام
            </h3>

            <strong>
              {
                statistics.attentionCount
              }
            </strong>

            <span>
              مواد
            </span>

            <button
              className="stat-link"
              onClick={() =>
                setActiveCategory(
                  "تحتاج اهتمام"
                )
              }
            >
              عرض التحليل

              <FaArrowLeft />
            </button>
          </div>
        </article>

        {/* Overall progress */}

        <article className="subject-stat-card">
          <div className="subject-stat-icon orange">
            <FaChartLine />
          </div>

          <div className="subject-stat-content">
            <h3>
              متوسط التقدم الكلي
            </h3>

            <strong>
              {
                statistics.averageProgress
              }
              %
            </strong>

            <span>
              إجمالي المنهج
            </span>
          </div>
        </article>

        {/* Completed subjects */}

        <article className="subject-stat-card">
          <div className="subject-stat-icon blue">
            <FaFileAlt />
          </div>

          <div className="subject-stat-content">
            <h3>
              المواد المكتملة
            </h3>

            <strong>
              {
                statistics.completedSubjects
              }

              <small>
                {" "}
                /{" "}
                {
                  statistics.totalSubjects
                }
              </small>
            </strong>

            <span>
              مواد
            </span>
          </div>
        </article>

        {/* Study hours */}

        <article className="subject-stat-card">
          <div className="subject-stat-icon green">
            <FaClock />
          </div>

          <div className="subject-stat-content">
            <h3>
              إجمالي ساعات المذاكرة
            </h3>

            <strong>
              {
                statistics.totalHours
              }
            </strong>

            <span>
              إجمالي المواد الحالية
            </span>
          </div>
        </article>
      </section>

      {/* =====================================================
          FILTERS
      ====================================================== */}

      <section className="subjects-toolbar">
        <div className="subjects-tabs">
          {[
            "كل المواد",
            "تحتاج اهتمام",
            "ممتازة",
          ].map((category) => (
            <button
              key={category}
              className={
                activeCategory ===
                category
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveCategory(
                  category
                )
              }
            >
              {category}
            </button>
          ))}
        </div>

        <div className="subjects-controls">
          <button
            className="filter-button"
            type="button"
          >
            تصفية
            <FaFilter />
          </button>

          <button
            className="sort-button"
            type="button"
            onClick={() => {
              const options = [
                "حسب التقدم",
                "الأكثر تقدمًا",
                "الأقل تقدمًا",
                "الاسم",
              ];

              const currentIndex =
                options.indexOf(
                  sortBy
                );

              const nextIndex =
                (currentIndex + 1) %
                options.length;

              setSortBy(
                options[nextIndex]
              );
            }}
          >
            <span>
              ترتيب: {sortBy}
            </span>

            <FaChevronDown />
          </button>
        </div>
      </section>

      {/* =====================================================
          SUBJECTS GRID
      ====================================================== */}

      <section className="subjects-grid">
        {filteredSubjects.length >
        0 ? (
          filteredSubjects.map(
            (subject) => (
              <article
                className="subject-card"
                key={subject.id}
              >
                {/* Card Header */}

                <div className="subject-card-header">
                  <button
                    className="subject-menu"
                    type="button"
                  >
                    <FaEllipsisH />
                  </button>

                  <div className="subject-title">
                    <h2>
                      {
                        subject.name
                      }
                    </h2>

                    <div
                      className={`subject-icon ${subject.iconType}`}
                    >
                      {
                        subject.icon
                      }
                    </div>
                  </div>
                </div>

                {/* Progress */}

                <div className="subject-main">
                  <div
                    className={`subject-progress ${getProgressClass(
                      subject.progress
                    )}`}
                    style={{
                      "--progress": `${
                        subject.progress *
                        3.6
                      }deg`,
                    }}
                  >
                    <div className="progress-inner">
                      <strong>
                        {
                          subject.progress
                        }
                        %
                      </strong>

                      <span>
                        التقدم
                      </span>
                    </div>
                  </div>

                  <div className="subject-status-wrapper">
                    <span
                      className={`subject-status ${subject.statusType}`}
                    >
                      {
                        subject.status
                      }
                    </span>
                  </div>
                </div>

                {/* Details */}

                <div className="subject-details">
                  <div className="subject-detail-row">
                    <span>
                      الدروس المكتملة
                    </span>

                    <strong>
                      {
                        subject.completedLessons
                      }{" "}
                      /{" "}
                      {
                        subject.totalLessons
                      }
                    </strong>
                  </div>

                  <div className="subject-detail-row">
                    <span>
                      <FaClock />
                      ساعات المذاكرة
                    </span>

                    <strong>
                      {
                        subject.studyHours
                      }
                    </strong>
                  </div>
                </div>

                {/* Action */}

                <button
                  className="subject-details-button"
                  type="button"
                  onClick={() =>
                    handleOpenSubject(
                      subject
                    )
                  }
                >
                  عرض التفاصيل

                  <FaArrowLeft />
                </button>
              </article>
            )
          )
        ) : (
          <div className="subjects-empty">
            <FaBook />

            <h3>
              لا توجد مواد متاحة
            </h3>

            <p>
              لا توجد مواد دراسية
              متاحة للمرحلة أو
              النظام الدراسي
              الحالي.
            </p>
          </div>
        )}
      </section>

      {/* =====================================================
          QUICK OVERVIEW
      ====================================================== */}

      <section className="quick-overview">
        <div className="overview-heading">
          <div>
            <h2>
              نظرة سريعة على تقدمك
            </h2>

            <p>
              المقارنة بين المواد
              الخاصة بك
            </p>
          </div>

          <div className="overview-image">
            📚
          </div>
        </div>

        <div className="overview-cards">
          {/* Needs attention */}

          <div className="overview-item">
            <div className="overview-icon warning">
              <FaExclamationTriangle />
            </div>

            <div className="overview-item-info">
              <span>
                تحتاج اهتمام
              </span>

              <strong>
                {
                  statistics.attentionCount
                }
              </strong>

              <small>
                مواد
              </small>

              <div className="overview-progress">
                <span
                  style={{
                    width: `${Math.min(
                      statistics.attentionCount *
                        20,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Lowest */}

          <div className="overview-item">
            <div className="overview-icon danger">
              <FaArrowLeft />
            </div>

            <div className="overview-item-info">
              <span>
                أقل تقدم
              </span>

              <strong>
                {statistics.lowestSubject
                  ? `${statistics.lowestSubject.progress}%`
                  : "0%"}
              </strong>

              <small>
                {statistics.lowestSubject
                  ? statistics
                      .lowestSubject
                      .name
                  : "-"}
              </small>

              <div className="overview-progress danger-progress">
                <span
                  style={{
                    width: `${
                      statistics
                        .lowestSubject
                        ?.progress ||
                      0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Most hours */}

          <div className="overview-item">
            <div className="overview-icon clock">
              <FaClock />
            </div>

            <div className="overview-item-info">
              <span>
                أكثر ساعات
              </span>

              <strong>
                {statistics.mostHoursSubject
                  ? statistics
                      .mostHoursSubject
                      .studyHours
                  : "0 س 0 د"}
              </strong>

              <small>
                {statistics.mostHoursSubject
                  ? statistics
                      .mostHoursSubject
                      .name
                  : "-"}
              </small>

              <div className="overview-progress">
                <span
                  style={{
                    width: `${
                      statistics
                        .mostHoursSubject
                        ?.progress ||
                      0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Best */}

          <div className="overview-item">
            <div className="overview-icon medal">
              <FaCheckCircle />
            </div>

            <div className="overview-item-info">
              <span>
                أعلى تقدم
              </span>

              <strong>
                {statistics.highestSubject
                  ? `${statistics.highestSubject.progress}%`
                  : "0%"}
              </strong>

              <small>
                {statistics.highestSubject
                  ? statistics
                      .highestSubject
                      .name
                  : "-"}
              </small>

              <div className="overview-progress">
                <span
                  style={{
                    width: `${
                      statistics
                        .highestSubject
                        ?.progress ||
                      0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Subjects;