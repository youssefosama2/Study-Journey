import React, { useEffect, useMemo, useState } from "react";
import {
  FaStar,
  FaFire,
  FaShieldAlt,
  FaMedal,
  FaTrophy,
  FaBookOpen,
  FaBullseye,
  FaCalendarAlt,
  FaClock,
  FaFileAlt,
  FaCheckSquare,
  FaArrowUp,
  FaChevronLeft,
  FaChevronRight,
  FaGraduationCap,
  FaTasks,
  FaLightbulb,
  FaCheckCircle,
  FaRocket,
  FaAward,
} from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import "./Achievements.css";
import Header from "../../components/Header/Header";
import { supabase } from "../../utils/supabaseClient";

const Achievements = () => {
  /* =====================================================
     STATE
  ===================================================== */

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [user, setUser] = useState(null);

  const [userPoints, setUserPoints] = useState(null);
  const [levels, setLevels] = useState([]);

  const [definitions, setDefinitions] = useState([]);
  const [progress, setProgress] = useState([]);
  const [earnedAchievements, setEarnedAchievements] = useState([]);
  const [pointTransactions, setPointTransactions] = useState([]);

  const [badgeStart, setBadgeStart] = useState(0);


  /* =====================================================
     GET ICON
  ===================================================== */

  const getAchievementIcon = (achievement) => {
    const title = achievement?.title || "";
    const category = achievement?.category || "";
    const icon = achievement?.icon || "";

    /*
      لو الـ icon المخزن في DB عبارة عن Emoji
      نعرضه مباشرة.
    */

    if (
      icon &&
      ![
        "star",
        "fire",
        "shield",
        "medal",
        "trophy",
        "book",
        "target",
        "calendar",
        "clock",
        "file",
        "task",
        "rocket",
        "award",
      ].includes(icon.toLowerCase())
    ) {
      return <span className="achievement-db-icon">{icon}</span>;
    }

    const iconName = icon.toLowerCase();

    if (iconName === "fire" || category === "الالتزام") {
      return <FaFire />;
    }

    if (iconName === "trophy") {
      return <FaTrophy />;
    }

    if (iconName === "target" || category === "الأهداف") {
      return <FaBullseye />;
    }

    if (iconName === "book" || category === "الدراسة") {
      return <FaBookOpen />;
    }

    if (iconName === "calendar") {
      return <FaCalendarAlt />;
    }

    if (iconName === "clock" || category === "التركيز") {
      return <FaClock />;
    }

    if (iconName === "file" || category === "المعلومات") {
      return <FaFileAlt />;
    }

    if (iconName === "task" || category === "المهام") {
      return <FaTasks />;
    }

    if (iconName === "rocket") {
      return <FaRocket />;
    }

    if (iconName === "award") {
      return <FaAward />;
    }

    if (category === "المراجعة") {
      return <FaShieldAlt />;
    }

    if (category === "الأخطاء") {
      return <FaLightbulb />;
    }

    return <FaMedal />;
  };


  /* =====================================================
     FORMAT DATE
  ===================================================== */

  const formatDate = (date) => {
    if (!date) return "غير محدد";

    try {
      return new Intl.DateTimeFormat("ar-EG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(date));
    } catch {
      return "غير محدد";
    }
  };


  /* =====================================================
     LOAD DATA
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const fetchAchievementsData = async () => {
      try {
        setLoading(true);
        setError("");

        /* -----------------------------------------------
           AUTH USER
        ------------------------------------------------ */

        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!currentUser) {
          throw new Error("لم يتم العثور على المستخدم");
        }

        if (!mounted) return;

        setUser(currentUser);


        /* -----------------------------------------------
           FETCH ALL DATA
        ------------------------------------------------ */

        const [
          userPointsResponse,
          levelsResponse,
          definitionsResponse,
          progressResponse,
          earnedResponse,
          transactionsResponse,
        ] = await Promise.all([
          supabase
            .from("user_points")
            .select("*")
            .eq("user_id", currentUser.id)
            .maybeSingle(),

          supabase
            .from("achievement_levels")
            .select("*")
            .order("level_number", {
              ascending: true,
            }),

          supabase
            .from("achievement_definitions")
            .select("*")
            .eq("is_active", true)
            .order("created_at", {
              ascending: true,
            }),

          supabase
            .from("user_achievement_progress")
            .select("*")
            .eq("user_id", currentUser.id),

          supabase
            .from("user_achievements")
            .select(`
              *,
              achievement_definitions (
                id,
                title,
                description,
                category,
                icon,
                icon_type,
                target_value,
                reward_points,
                level_required,
                is_badge,
                is_active
              )
            `)
            .eq("user_id", currentUser.id)
            .order("achieved_at", {
              ascending: false,
            }),

          supabase
            .from("point_transactions")
            .select("*")
            .eq("user_id", currentUser.id)
            .order("created_at", {
              ascending: false,
            }),
        ]);


        /* -----------------------------------------------
           CHECK ERRORS
        ------------------------------------------------ */

        if (userPointsResponse.error) {
          throw userPointsResponse.error;
        }

        if (levelsResponse.error) {
          throw levelsResponse.error;
        }

        if (definitionsResponse.error) {
          throw definitionsResponse.error;
        }

        if (progressResponse.error) {
          throw progressResponse.error;
        }

        if (earnedResponse.error) {
          throw earnedResponse.error;
        }

        if (transactionsResponse.error) {
          throw transactionsResponse.error;
        }


        if (!mounted) return;


        /* -----------------------------------------------
           SET STATE
        ------------------------------------------------ */

        setUserPoints(userPointsResponse.data);

        setLevels(levelsResponse.data || []);

        setDefinitions(
          definitionsResponse.data || []
        );

        setProgress(
          progressResponse.data || []
        );

        setEarnedAchievements(
          earnedResponse.data || []
        );

        setPointTransactions(
          transactionsResponse.data || []
        );


        /* -----------------------------------------------
           RUN ENGINE ON PAGE LOAD
           
           ده مفيد لو عندنا بيانات قديمة قبل إضافة
           الـ trigger أو achievement engine.
        ------------------------------------------------ */

        const { error: engineError } =
          await supabase.rpc(
            "process_user_achievements",
            {
              p_user_id: currentUser.id,
            }
          );

        if (engineError) {
          console.warn(
            "Achievement engine:",
            engineError.message
          );
        }


        /*
          لو الـ engine عمل achievements جديدة،
          نعيد تحميل الصفحة من DB.
        */

        if (!mounted) return;


        const [
          refreshedPoints,
          refreshedProgress,
          refreshedEarned,
          refreshedTransactions,
        ] = await Promise.all([
          supabase
            .from("user_points")
            .select("*")
            .eq("user_id", currentUser.id)
            .maybeSingle(),

          supabase
            .from("user_achievement_progress")
            .select("*")
            .eq("user_id", currentUser.id),

          supabase
            .from("user_achievements")
            .select(`
              *,
              achievement_definitions (
                id,
                title,
                description,
                category,
                icon,
                icon_type,
                target_value,
                reward_points,
                level_required,
                is_badge,
                is_active
              )
            `)
            .eq("user_id", currentUser.id)
            .order("achieved_at", {
              ascending: false,
            }),

          supabase
            .from("point_transactions")
            .select("*")
            .eq("user_id", currentUser.id)
            .order("created_at", {
              ascending: false,
            }),
        ]);


        if (!mounted) return;


        if (!refreshedPoints.error) {
          setUserPoints(refreshedPoints.data);
        }

        if (!refreshedProgress.error) {
          setProgress(
            refreshedProgress.data || []
          );
        }

        if (!refreshedEarned.error) {
          setEarnedAchievements(
            refreshedEarned.data || []
          );
        }

        if (!refreshedTransactions.error) {
          setPointTransactions(
            refreshedTransactions.data || []
          );
        }

      } catch (err) {
        console.error(
          "Achievements error:",
          err
        );

        if (mounted) {
          setError(
            err?.message ||
              "حدث خطأ أثناء تحميل الإنجازات"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };


    fetchAchievementsData();


    return () => {
      mounted = false;
    };
  }, []);


  /* =====================================================
     BASIC VALUES
  ===================================================== */

  const totalPoints =
    userPoints?.total_points || 0;

  const currentStreak =
    userPoints?.current_streak || 0;

  const longestStreak =
    userPoints?.longest_streak || 0;

  const currentLevel =
    userPoints?.current_level || 1;


  /* =====================================================
     CURRENT LEVEL
  ===================================================== */

  const currentLevelData = useMemo(() => {
    return (
      levels.find(
        (level) =>
          level.level_number === currentLevel
      ) ||
      levels[levels.length - 1] ||
      null
    );
  }, [levels, currentLevel]);


  const nextLevelData = useMemo(() => {
    return (
      levels.find(
        (level) =>
          level.level_number ===
          currentLevel + 1
      ) || null
    );
  }, [levels, currentLevel]);


  const levelMinPoints =
    currentLevelData?.min_points || 0;

  const levelMaxPoints =
    nextLevelData?.min_points ??
    currentLevelData?.max_points ??
    levelMinPoints;


  const levelRange =
    Math.max(
      levelMaxPoints - levelMinPoints,
      1
    );


  const levelProgress =
    Math.min(
      Math.max(
        ((totalPoints - levelMinPoints) /
          levelRange) *
          100,
        0
      ),
      100
    );


  const remainingLevelPoints =
    Math.max(
      levelMaxPoints - totalPoints,
      0
    );


  /* =====================================================
     EARNED
  ===================================================== */

  const earnedCount =
    earnedAchievements.length;


  const badgeCount = earnedAchievements.filter(
    (item) =>
      item.achievement_definitions?.is_badge
  ).length;


  /* =====================================================
     MONTHLY POINTS
  ===================================================== */

  const monthlyPoints = useMemo(() => {
    const now = new Date();

    const currentMonth =
      now.getMonth();

    const currentYear =
      now.getFullYear();

    return pointTransactions
      .filter((transaction) => {
        const date =
          new Date(transaction.created_at);

        return (
          date.getMonth() ===
            currentMonth &&
          date.getFullYear() ===
            currentYear
        );
      })
      .reduce(
        (sum, transaction) =>
          sum + (transaction.points || 0),
        0
      );
  }, [pointTransactions]);


  /* =====================================================
     BADGES
  ===================================================== */

  const badges = useMemo(() => {
    return earnedAchievements
      .filter(
        (item) =>
          item.achievement_definitions?.is_badge
      )
      .map((item) => {
        const achievement =
          item.achievement_definitions;

        return {
          id: item.id,

          title:
            achievement?.title ||
            "إنجاز",

          description:
            achievement?.description ||
            "",

          date: formatDate(
            item.achieved_at
          ),

          icon: getAchievementIcon(
            achievement
          ),

          type:
            achievement?.category ===
            "الالتزام"
              ? "red"
              : achievement?.category ===
                "المهام"
              ? "orange"
              : achievement?.category ===
                "الأهداف"
              ? "green"
              : achievement?.category ===
                "الدراسة"
              ? "purple"
              : "blue",
        };
      });
  }, [earnedAchievements]);


  /* =====================================================
     BADGE SLIDER
  ===================================================== */

  const visibleBadges =
    badges.slice(
      badgeStart,
      badgeStart + 5
    );


  const canGoBadgeLeft =
    badgeStart + 5 < badges.length;


  const canGoBadgeRight =
    badgeStart > 0;


  /* =====================================================
     RECENT ACHIEVEMENTS
  ===================================================== */

  const recentAchievements =
    useMemo(() => {
      return earnedAchievements
        .slice(0, 5)
        .map((item) => {
          const achievement =
            item.achievement_definitions;

          return {
            id: item.id,

            date: formatDate(
              item.achieved_at
            ),

            title:
              achievement?.title ||
              "إنجاز جديد",

            description:
              achievement?.description ||
              "",

            points: `+${
              item.points_earned || 0
            } نقطة`,

            icon: getAchievementIcon(
              achievement
            ),

            type:
              achievement?.category ===
              "الأهداف"
                ? "green"
                : achievement?.category ===
                  "التركيز"
                ? "blue"
                : achievement?.category ===
                  "المعلومات"
                ? "purple"
                : achievement?.category ===
                  "الالتزام"
                ? "orange"
                : "gold",
          };
        });
    }, [earnedAchievements]);


  /* =====================================================
     CATEGORY DATA
  ===================================================== */

  const categories = useMemo(() => {
    const categoryMap = {};

    earnedAchievements.forEach(
      (item) => {
        const category =
          item.achievement_definitions
            ?.category ||
          "أخرى";

        categoryMap[category] =
          (categoryMap[category] || 0) + 1;
      }
    );

    const total =
      earnedAchievements.length || 1;

    const categoryTypes = [
      "purple",
      "green",
      "blue",
      "orange",
      "red",
    ];

    return Object.entries(
      categoryMap
    )
      .map(
        (
          [name, value],
          index
        ) => ({
          name,
          value,
          percentage: Math.round(
            (value / total) * 100
          ),
          type:
            categoryTypes[
              index %
                categoryTypes.length
            ],
        })
      )
      .sort(
        (a, b) =>
          b.value - a.value
      );
  }, [earnedAchievements]);


  /* =====================================================
     CATEGORY DONUT
  ===================================================== */

  const donutBackground = useMemo(() => {
    if (!categories.length) {
      return "conic-gradient(#dfe5ef 0deg 360deg)";
    }

    const colors = [
      "#8056d9",
      "#35ad7d",
      "#3d78dc",
      "#eea42e",
      "#e25c5c",
    ];

    let currentDegree = 0;

    const parts = categories.map(
      (category, index) => {
        const degree =
          (category.value /
            earnedAchievements.length) *
          360;

        const start =
          currentDegree;

        const end =
          currentDegree +
          degree;

        currentDegree = end;

        return `${colors[index % colors.length]} ${start}deg ${end}deg`;
      }
    );

    return `conic-gradient(${parts.join(
      ", "
    )})`;
  }, [
    categories,
    earnedAchievements.length,
  ]);


  /* =====================================================
     TOP POINT ACHIEVEMENTS
  ===================================================== */

  const topAchievements =
    useMemo(() => {
      return [...earnedAchievements]
        .sort(
          (a, b) =>
            (b.points_earned || 0) -
            (a.points_earned || 0)
        )
        .slice(0, 3)
        .map(
          (item, index) => {
            const achievement =
              item.achievement_definitions;

            return {
              id: item.id,

              rank: index + 1,

              title:
                achievement?.title ||
                "إنجاز",

              description:
                achievement?.description ||
                "",

              points: `+${
                item.points_earned || 0
              } نقطة`,

              icon: getAchievementIcon(
                achievement
              ),

              type:
                index === 0
                  ? "gold"
                  : index === 1
                  ? "green"
                  : "red",
            };
          }
        );
    }, [earnedAchievements]);


  /* =====================================================
     NEARBY ACHIEVEMENTS
  ===================================================== */

  const nearbyAchievements =
    useMemo(() => {
      const earnedIds =
        new Set(
          earnedAchievements.map(
            (item) =>
              item.achievement_id
          )
        );

      return progress
        .filter(
          (item) =>
            !item.is_completed &&
            !earnedIds.has(
              item.achievement_id
            )
        )
        .map((item) => {
          const achievement =
            definitions.find(
              (definition) =>
                definition.id ===
                item.achievement_id
            );

          if (!achievement) {
            return null;
          }

          const current =
            Number(
              item.current_value || 0
            );

          const total =
            Number(
              item.target_value ||
                achievement.target_value ||
                1
            );

          const percentage =
            Math.min(
              (current / total) *
                100,
              100
            );

          return {
            id: item.id,

            title:
              achievement.title,

            description:
              achievement.description,

            current,

            total,

            reward: `+${
              achievement.reward_points ||
              0
            } نقطة`,

            icon:
              getAchievementIcon(
                achievement
              ),

            type:
              achievement.category ===
              "الأهداف"
                ? "green"
                : achievement.category ===
                  "المهام"
                ? "orange"
                : achievement.category ===
                  "التركيز"
                ? "purple"
                : achievement.category ===
                  "الدراسة"
                ? "blue"
                : "green",

            percentage,
          };
        })
        .filter(Boolean)
        .sort(
          (a, b) =>
            b.percentage -
            a.percentage
        )
        .slice(0, 4);
    }, [
      progress,
      definitions,
      earnedAchievements,
    ]);


  /* =====================================================
     ALL ACHIEVEMENTS COUNT
  ===================================================== */

  const totalDefinitions =
    definitions.length;


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <main className="achievements-page">
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


  /* =====================================================
     ERROR
  ===================================================== */

  if (error) {
    return (
      <main className="achievements-page">
        <Header />

        <div className="achievements-error">
          <FaShieldAlt />

          <h2>
            حدث خطأ أثناء تحميل الإنجازات
          </h2>

          <p>{error}</p>

          <button
            onClick={() =>
              window.location.reload()
            }
          >
            إعادة المحاولة
          </button>
        </div>
      </main>
    );
  }


  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <main className="achievements-page">
      <Header />

      {/* =========================
          STATS
      ========================= */}

      <section className="achievements-stats">

        <div className="achievement-stat-card blue">
          <div className="achievement-stat-icon">
            <FaStar />
          </div>

          <div className="achievement-stat-content">
            <h3>النقاط الإجمالية</h3>

            <strong>
              {totalPoints.toLocaleString(
                "ar-EG"
              )}
            </strong>

            <span>نقطة</span>

            <small>
              {monthlyPoints > 0
                ? `↑ ${monthlyPoints.toLocaleString(
                    "ar-EG"
                  )} هذا الشهر`
                : "ابدأ رحلتك لجمع النقاط"}
            </small>
          </div>
        </div>


        <div className="achievement-stat-card orange">
          <div className="achievement-stat-icon">
            <FaFire />
          </div>

          <div className="achievement-stat-content">
            <h3>أيام متتالية</h3>

            <strong>
              {currentStreak.toLocaleString(
                "ar-EG"
              )}
            </strong>

            <span>يوم</span>

            <small>
              أطول سلسلة:{" "}
              {longestStreak.toLocaleString(
                "ar-EG"
              )}{" "}
              يوم
            </small>
          </div>
        </div>


        <div className="achievement-stat-card purple">
          <div className="achievement-stat-icon">
            <FaShieldAlt />
          </div>

          <div className="achievement-stat-content">
            <h3>الشارات المحققة</h3>

            <strong>
              {badgeCount.toLocaleString(
                "ar-EG"
              )}
            </strong>

            <span>شارة</span>

            <small>
              من أصل{" "}
              {
                definitions.filter(
                  (item) =>
                    item.is_badge
                ).length
              }{" "}
              شارة
            </small>
          </div>
        </div>


        <div className="achievement-stat-card green">
          <div className="achievement-stat-icon">
            <FaAward />
          </div>

          <div className="achievement-stat-content">
            <h3>إجمالي الإنجازات</h3>

            <strong>
              {earnedCount.toLocaleString(
                "ar-EG"
              )}
            </strong>

            <span>إنجاز</span>

            <small>
              من أصل{" "}
              {totalDefinitions.toLocaleString(
                "ar-EG"
              )}
            </small>
          </div>
        </div>

      </section>


      {/* =========================
          LEVEL SECTION
      ========================= */}

      <section className="level-section">

        <div className="current-level">

          <div className="level-header">
            <h2>مستواك الحالي</h2>
          </div>

          <div className="level-content">

            <div className="level-badge">
              <FaShieldAlt />

              <FaStar className="level-star" />
            </div>

            <div className="level-info">

              <h3>
                المستوى{" "}
                <strong>
                  {currentLevel}
                </strong>
              </h3>

              <span>
                {currentLevelData?.title ||
                  "المبتدئ"}
              </span>

              <p>
                {nextLevelData
                  ? `${totalPoints.toLocaleString(
                      "ar-EG"
                    )} / ${nextLevelData.min_points.toLocaleString(
                      "ar-EG"
                    )} نقطة للوصول للمستوى ${nextLevelData.level_number}`
                  : `${totalPoints.toLocaleString(
                      "ar-EG"
                    )} نقطة — وصلت لأعلى مستوى`}
              </p>

              <div className="level-progress">
                <div
                  style={{
                    width: `${levelProgress}%`,
                  }}
                />
              </div>

              <small>
                {Math.round(
                  levelProgress
                )}
                %
              </small>

            </div>

          </div>

        </div>


        <div className="next-level">

          <div className="level-header">
            <h2>
              تقدمك نحو المستوى التالي
            </h2>
          </div>

          <div className="levels-track">

            {levels
              .filter(
                (level) =>
                  level.level_number >=
                    Math.max(
                      currentLevel - 1,
                      1
                    ) &&
                  level.level_number <=
                    currentLevel + 2
              )
              .map(
                (level, index, array) => (
                  <React.Fragment
                    key={level.id}
                  >

                    <div
                      className={`level-node ${
                        level.level_number <=
                        currentLevel
                          ? "active"
                          : ""
                      }`}
                    >
                      <span>
                        {
                          level.level_number
                        }
                      </span>

                      <small>
                        {level.title}
                      </small>
                    </div>

                    {index <
                      array.length - 1 && (
                      <div
                        className={`level-line ${
                          level.level_number <
                          currentLevel
                            ? "active"
                            : ""
                        }`}
                      />
                    )}

                  </React.Fragment>
                )
              )}

          </div>

          <button
            className="show-levels-btn"
            type="button"
          >
            جميع المستويات:{" "}
            {levels.length}
          </button>

        </div>

      </section>


      {/* =========================
          BADGES
      ========================= */}

      <section className="badges-section">

        <div className="section-header">

          <div>
            <h2>الشارات المحققة</h2>

            <p>
              الشارات التي حصلت عليها خلال رحلتك
            </p>
          </div>

          <button type="button">
            {badgeCount} شارة محققة
          </button>

        </div>


        <div className="badges-slider">

          <button
            className="slider-arrow"
            type="button"
            disabled={!canGoBadgeRight}
            onClick={() =>
              setBadgeStart(
                Math.max(
                  badgeStart - 1,
                  0
                )
              )
            }
          >
            <FaChevronRight />
          </button>


          <div className="badges-list">

            {visibleBadges.length > 0 ? (
              visibleBadges.map(
                (badge) => (
                  <div
                    className={`badge-card ${badge.type}`}
                    key={badge.id}
                  >

                    <div className="badge-icon">
                      {badge.icon}
                    </div>

                    <h3>
                      {badge.title}
                    </h3>

                    <p>
                      {badge.description}
                    </p>

                    <small>
                      {badge.date}
                    </small>

                    <div className="badge-check">
                      <FaCheckCircle />
                    </div>

                  </div>
                )
              )
            ) : (
              <div className="empty-achievements">
                <FaAward />

                <p>
                  لم تحصل على أي شارة بعد
                </p>

                <small>
                  ابدأ تنفيذ الأنشطة لفتح أول شارة
                </small>
              </div>
            )}

          </div>


          <button
            className="slider-arrow"
            type="button"
            disabled={!canGoBadgeLeft}
            onClick={() =>
              setBadgeStart(
                Math.min(
                  badgeStart + 1,
                  Math.max(
                    badges.length - 5,
                    0
                  )
                )
              )
            }
          >
            <FaChevronLeft />
          </button>

        </div>

      </section>


      {/* =========================
          LOWER GRID
      ========================= */}

      <section className="achievements-lower-grid">

        {/* RECENT */}

        <div className="recent-achievements panel-card">

          <div className="panel-header">
            <h2>أحدث الإنجازات</h2>

            <button type="button">
              {earnedCount} إنجاز
            </button>
          </div>


          <div className="recent-list">

            {recentAchievements.length > 0 ? (
              recentAchievements.map(
                (item) => (
                  <div
                    className="recent-item"
                    key={item.id}
                  >

                    <div
                      className={`recent-icon ${item.type}`}
                    >
                      {item.icon}
                    </div>

                    <div className="recent-info">

                      <strong>
                        {item.title}
                      </strong>

                      <span>
                        {item.description}
                      </span>

                    </div>

                    <div className="recent-points">
                      {item.points}
                    </div>

                    <time>
                      {item.date}
                    </time>

                  </div>
                )
              )
            ) : (
              <div className="empty-achievements">
                <FaTrophy />

                <p>
                  لا توجد إنجازات محققة حتى الآن
                </p>

                <small>
                  استمر في الدراسة وستظهر إنجازاتك هنا
                </small>
              </div>
            )}

          </div>

        </div>


        {/* CATEGORY */}

        <div className="category-achievements panel-card">

          <div className="panel-header">
            <h2>
              الإنجازات حسب الفئة
            </h2>
          </div>


          <div className="category-content">

            <div
              className="category-donut"
              style={{
                background:
                  donutBackground,
              }}
            >
              <div className="category-donut-inner">

                <strong>
                  {earnedCount}
                </strong>

                <span>
                  إنجاز
                </span>

              </div>
            </div>


            <div className="category-list">

              {categories.length > 0 ? (
                categories.map(
                  (
                    category
                  ) => (
                    <div
                      className="category-row"
                      key={
                        category.name
                      }
                    >

                      <span
                        className={`category-dot ${category.type}`}
                      />

                      <span className="category-name">
                        {
                          category.name
                        }
                      </span>

                      <strong>
                        {
                          category.value
                        }
                      </strong>

                      <small>
                        (
                        {
                          category.percentage
                        }
                        %)
                      </small>

                    </div>
                  )
                )
              ) : (
                <div className="empty-category">
                  لم تحقق إنجازات بعد
                </div>
              )}

            </div>

          </div>


          <button
            className="details-btn"
            type="button"
          >
            عرض التفاصيل
          </button>

        </div>


        {/* TOP ACHIEVEMENTS */}

        <div className="top-achievements panel-card">

          <div className="panel-header">
            <h2>
              أكثر الإنجازات نقاطًا
            </h2>
          </div>


          <div className="top-list">

            {topAchievements.length > 0 ? (
              topAchievements.map(
                (item) => (
                  <div
                    className="top-item"
                    key={item.id}
                  >

                    <span
                      className={`rank rank-${item.rank}`}
                    >
                      {item.rank}
                    </span>

                    <div
                      className={`top-icon ${item.type}`}
                    >
                      {item.icon}
                    </div>

                    <div className="top-info">

                      <strong>
                        {item.title}
                      </strong>

                      <span>
                        {item.description}
                      </span>

                    </div>

                    <b>
                      {item.points}
                    </b>

                  </div>
                )
              )
            ) : (
              <div className="empty-achievements">
                <FaMedal />

                <p>
                  لا توجد بيانات بعد
                </p>
              </div>
            )}

          </div>


          <button
            className="details-btn"
            type="button"
          >
            عرض جميع الإنجازات
          </button>

        </div>

      </section>


      {/* =========================
          NEARBY ACHIEVEMENTS
      ========================= */}

      <section className="nearby-section panel-card">

        <div className="panel-header">

          <div>
            <h2>
              إنجازات قريبة منك
            </h2>

            <p>
              واصل التقدم لتحصل على المزيد من النقاط
            </p>
          </div>

        </div>


        <div className="nearby-grid">

          {nearbyAchievements.length > 0 ? (
            nearbyAchievements.map(
              (item) => {

                const percentage =
                  item.percentage;

                return (
                  <div
                    className="nearby-card"
                    key={item.id}
                  >

                    <div
                      className={`nearby-icon ${item.type}`}
                    >
                      {item.icon}
                    </div>


                    <div className="nearby-content">

                      <h3>
                        {item.title}
                      </h3>

                      <p>
                        {item.description}
                      </p>


                      <div className="nearby-numbers">

                        <strong>
                          {item.current.toLocaleString(
                            "ar-EG"
                          )}{" "}
                          /{" "}
                          {item.total.toLocaleString(
                            "ar-EG"
                          )}
                        </strong>

                        <span>
                          {Math.round(
                            percentage
                          )}
                          %
                        </span>

                      </div>


                      <div className="nearby-progress">

                        <div
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>


                      <span className="reward">
                        {item.reward}
                      </span>

                    </div>

                  </div>
                );
              }
            )
          ) : (
            <div className="empty-nearby">
              <FaRocket />

              <h3>
                ممتاز! 🎉
              </h3>

              <p>
                لا توجد إنجازات قريبة حاليًا.
                استمر في التقدم لفتح إنجازات جديدة.
              </p>
            </div>
          )}

        </div>


        <button
          className="nearby-footer-btn"
          type="button"
        >
          عرض جميع الإنجازات القريبة
        </button>

      </section>


      {/* =========================
          BOTTOM MESSAGE
      ========================= */}

      <section className="achievement-tip">

        <div className="tip-icon">
          <FaRocket />
        </div>

        <p>
          كل إنجاز صغير يقربك من هدفك الكبير، استمر في
          رحلتك نحو التميز!
        </p>

        <FaStar className="tip-star" />

      </section>

    </main>
  );
};

export default Achievements;