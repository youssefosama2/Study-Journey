import React, { useEffect, useMemo, useState } from "react";
import {
  FaCheck,
  FaClock,
  FaCreditCard,
  FaCrown,
  FaWhatsapp,
  FaShieldAlt,
  FaBolt,
  FaCopy,
  FaUsers,
  FaGift,
  FaLink,
  FaCheckCircle,
  FaHourglassHalf,
  FaShareAlt,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { supabase } from "../../utils/supabaseClient";
import Header from "../../components/Header/Header";
import "./Subscription.css";

const PLANS = [
  {
    id: "monthly",
    name: "الباقة الشهرية",
    duration: 0,
    price: 0,
    originalPrice: 0,
    description: "اشتراك لمدة شهر كامل",
    popular: false,
    discount: 0,
  },
  {
    id: "quarterly",
    name: "باقة 3 شهور",
    duration: 0,
    price: 0,
    originalPrice: 0,
    description: "استمرارية أطول بسعر أوفر",
    popular: true,
    discount: 13,
  },
  {
    id: "half-year",
    name: "باقة 6 شهور",
    duration: 0,
    price: 0,
    originalPrice: 0,
    description: "اشتراك طويل بدون تجديد متكرر",
    popular: false,
    discount: 17,
  },
  {
    id: "yearly",
    name: "الباقة السنوية",
    duration: 0,
    price: 0,
    originalPrice: 0,
    description: "أفضل قيمة لمدة عام كامل",
    popular: false,
    discount: 25,
  },
];

const WHATSAPP_NUMBER = "201091654379";
const CASH_NUMBER = "01091654379";

function Subscription() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1]);

  // =====================================================
  // Referral State
  // =====================================================

  const [referralLoading, setReferralLoading] = useState(true);

  const [referralData, setReferralData] = useState({
    referralCode: "",
    completedReferrals: 0,
    pendingReferrals: 0,
    earnedFreeMonths: 0,
    referralsUntilNextReward: 5,
    referrals: [],
  });

  useEffect(() => {
    fetchSubscription();
    fetchReferralData();
  }, []);

  // =====================================================
  // Fetch Subscription
  // =====================================================

  const fetchSubscription = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("GET USER ERROR:", userError);
        return;
      }

      if (!user) {
        setSubscription(null);
        return;
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          id,
          start_date,
          end_date,
          duration_days,
          amount,
          status,
          subscription_type,
          notes
        `)
        .eq("user_id", user.id)
        .order("end_date", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          "SUBSCRIPTION FETCH ERROR:",
          error
        );
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error(
        "SUBSCRIPTION PAGE ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // Fetch Referral Data
  // =====================================================

  const fetchReferralData = async () => {
    try {
      setReferralLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("REFERRAL USER ERROR:", userError);
        throw userError;
      }

      if (!user) {
        console.error("REFERRAL: NO AUTH USER");
        return;
      }

      // =================================================
      // 1. Student Profile
      // =================================================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("student_profiles")
        .select("referral_code")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      // =================================================
      // 2. Referral Stats
      // =================================================

      const {
        data: stats,
        error: statsError,
      } = await supabase
        .from("referral_stats")
        .select(`
          user_id,
          completed_referrals,
          pending_referrals,
          earned_free_months,
          referrals_until_next_reward
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (statsError) {
        throw statsError;
      }

      // =================================================
      // 3. Referrals
      // =================================================

      const {
        data: referrals,
        error: referralsError,
      } = await supabase
        .from("referrals")
        .select(`
          id,
          referred_user_id,
          status,
          registered_at,
          completed_at,
          completed_subscription_id
        `)
        .eq("referrer_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (referralsError) {
        throw referralsError;
      }

      // =================================================
      // 4. Referred Students
      // =================================================

      const referredUserIds = [
        ...new Set(
          (referrals || []).map(
            (referral) =>
              referral.referred_user_id
          )
        ),
      ];

      let profilesMap = {};

      if (referredUserIds.length > 0) {
        const {
          data: referredProfiles,
          error: referredProfilesError,
        } = await supabase
          .from("student_profiles")
          .select(`
            user_id,
            full_name,
            avatar_url
          `)
          .in("user_id", referredUserIds);

        if (referredProfilesError) {
          throw referredProfilesError;
        }

        profilesMap = Object.fromEntries(
          (referredProfiles || []).map(
            (profile) => [
              profile.user_id,
              profile,
            ]
          )
        );
      }

      // =================================================
      // 5. Build Data
      // =================================================

      const completedReferrals = Number(
        stats?.completed_referrals || 0
      );

      const pendingReferrals = Number(
        stats?.pending_referrals || 0
      );

      const earnedFreeMonths = Number(
        stats?.earned_free_months || 0
      );

      const referralsUntilNextReward =
        completedReferrals > 0 &&
        completedReferrals % 5 === 0
          ? 5
          : Number(
              stats?.referrals_until_next_reward ||
                5
            );

      const formattedReferrals = (
        referrals || []
      ).map((referral) => ({
        ...referral,
        profile:
          profilesMap[
            referral.referred_user_id
          ] || null,
      }));

      setReferralData({
        referralCode:
          profile?.referral_code || "",

        completedReferrals,

        pendingReferrals,

        earnedFreeMonths,

        referralsUntilNextReward,

        referrals: formattedReferrals,
      });

    } catch (error) {
      console.error(
        "REFERRAL FETCH ERROR:",
        error
      );
    } finally {
      setReferralLoading(false);
    }
  };

  // =====================================================
  // Subscription Info
  // =====================================================

  const subscriptionInfo = useMemo(() => {
    if (!subscription) {
      return {
        type: "none",
        title: "لا يوجد اشتراك",
        message:
          "لا يوجد اشتراك حالي. يمكن تفعيل إحدى الباقات المتاحة.",
        remaining: 0,
        active: false,
      };
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const endDate = new Date(
      `${subscription.end_date}T00:00:00`
    );

    endDate.setHours(0, 0, 0, 0);

    const difference =
      endDate.getTime() -
      today.getTime();

    const remaining = Math.max(
      0,
      Math.ceil(
        difference /
          (1000 * 60 * 60 * 24)
      )
    );

    const active =
      subscription.status === "active" &&
      endDate.getTime() >=
        today.getTime();

    if (
      subscription.subscription_type ===
        "trial" &&
      active
    ) {
      return {
        type: "trial",
        title: "الفترة التجريبية",
        message:
          "الحساب حاليًا ضمن الفترة التجريبية المجانية.",
        remaining,
        active: true,
      };
    }

    if (active) {
      return {
        type: "active",
        title: "الاشتراك فعال",
        message:
          "الاشتراك فعال ويمكن استخدام جميع أدوات Study Journey.",
        remaining,
        active: true,
      };
    }

    return {
      type: "expired",
      title: "انتهى الاشتراك",
      message:
        "انتهت مدة الاشتراك. يمكن تفعيل باقة جديدة لمواصلة استخدام المنصة.",
      remaining: 0,
      active: false,
    };
  }, [subscription]);

  // =====================================================
  // Format Date
  // =====================================================

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // =====================================================
  // Referral Link
  // =====================================================

  const referralLink = useMemo(() => {
    if (!referralData.referralCode) {
      return "";
    }

    return `${window.location.origin}/signup?ref=${encodeURIComponent(
      referralData.referralCode
    )}`;
  }, [referralData.referralCode]);

  // =====================================================
  // Copy Referral Link
  // =====================================================

  const handleCopyReferralLink = async () => {
    if (!referralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        referralLink
      );

      await Swal.fire({
        icon: "success",
        title: "تم النسخ",
        text: "تم نسخ رابط الدعوة بنجاح.",
        confirmButtonText: "حسنًا",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(
        "COPY REFERRAL LINK ERROR:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "تعذر النسخ",
        text:
          "لم نتمكن من نسخ الرابط تلقائيًا. يمكنك نسخه يدويًا.",
        confirmButtonText: "حسنًا",
      });
    }
  };

  // =====================================================
  // Share Referral Link
  // =====================================================

    const handleShareReferralLink = async () => {
    if (!referralLink) {
      return;
    }

    const shareData = {
      title: "انضم إلى Study Journey",
      text: "انضم إلى Study Journey من خلال رابط الدعوة الخاص بي 🎓",
      url: referralLink,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(referralLink);

      await Swal.fire({
        icon: "success",
        title: "تم نسخ الرابط",
        text: "المتصفح لا يدعم المشاركة المباشرة، لذلك تم نسخ الرابط ويمكنك إرساله لأي شخص.",
        confirmButtonText: "حسنًا",
      });
    } catch (error) {
      // المستخدم ممكن يقفل نافذة المشاركة
      if (error?.name === "AbortError") {
        return;
      }

      console.error(
        "SHARE REFERRAL LINK ERROR:",
        error
      );
    }
  };

  // =====================================================
  // Copy Referral Code
  // =====================================================

  const handleCopyReferralCode = async () => {
    if (!referralData.referralCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        referralData.referralCode
      );

      await Swal.fire({
        icon: "success",
        title: "تم النسخ",
        text: "تم نسخ كود الدعوة.",
        confirmButtonText: "حسنًا",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(
        "COPY REFERRAL CODE ERROR:",
        error
      );
    }
  };

  // =====================================================
  // WhatsApp Payment
  // =====================================================

  const handleWhatsApp = () => {
    const message = `مرحبًا، أرغب في الاشتراك في Study Journey.

الباقة: ${selectedPlan.name}
المدة: ${selectedPlan.duration} يوم
السعر: ${selectedPlan.price} جنيه
الخصم: ${
      selectedPlan.discount > 0
        ? `${selectedPlan.discount}%`
        : "بدون خصم"
    }

رقم Vodafone Cash للتحويل:
${CASH_NUMBER}

سيتم إرسال صورة التحويل لتفعيل الاشتراك.`;

    const url =
      `https://wa.me/${WHATSAPP_NUMBER}` +
      `?text=${encodeURIComponent(message)}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =====================================================
  // Referral Progress
  // =====================================================

  const referralProgress = Math.min(
    100,
    (referralData.completedReferrals % 5) * 20
  );

  // =====================================================
  // Loading
  // =====================================================

  if (loading) {
    return (
      <div className="subscription-page">
        <Header />

        <div className="subscription-loading">
          <div className="subscription-spinner"></div>

          <p>
            جاري تحميل بيانات الاشتراك...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="subscription-page">

      <main className="subscription-container">

        <Header />

        {/* ======================================
            Hero
        ====================================== */}

        <section className="subscription-hero">

          <div className="subscription-hero-icon">
            <FaCrown />
          </div>

          <div className="subscription-hero-content">

            <span className="subscription-eyebrow">
              Study Journey Premium
            </span>

            <h1>
              استمر في رحلتك الدراسية بدون توقف
            </h1>

            <p>
              باقات مرنة للوصول إلى جميع أدوات
              Study Journey.
            </p>

          </div>

        </section>

        {/* ======================================
            Current Subscription
        ====================================== */}

        <section className="current-subscription-card">

          <div className="current-subscription-header">

            <div className="current-subscription-title">

              <span className="current-icon">
                <FaClock />
              </span>

              <div>

                <span>
                  حالة الاشتراك الحالية
                </span>

                <h2>
                  {subscriptionInfo.title}
                </h2>

              </div>

            </div>

            <span
              className={`subscription-status ${
                subscriptionInfo.active
                  ? "active"
                  : "expired"
              }`}
            >
              {subscriptionInfo.active
                ? "فعال"
                : "منتهي"}
            </span>

          </div>

          <div className="current-subscription-content">

            <div className="subscription-stat">

              <span>
                تاريخ البداية
              </span>

              <strong>
                {formatDate(
                  subscription?.start_date
                )}
              </strong>

            </div>

            <div className="subscription-stat">

              <span>
                تاريخ الانتهاء
              </span>

              <strong>
                {formatDate(
                  subscription?.end_date
                )}
              </strong>

            </div>

            <div className="subscription-stat highlight">

              <span>
                المتبقي
              </span>

              <strong>
                {subscriptionInfo.remaining}

                <small>
                  يوم
                </small>

              </strong>

            </div>

          </div>

          <p className="current-subscription-message">
            {subscriptionInfo.message}
          </p>

        </section>

        {/* ======================================
            Referral Program
        ====================================== */}

        <section className="referral-section">

          <div className="referral-header">

            <div className="referral-header-icon">
              <FaGift />
            </div>

            <div>

              <span className="referral-eyebrow">
                برنامج الإحالة
              </span>

              <h2>
                ادعُ أصدقاءك واحصل على شهر مجاني 🎁
              </h2>

              <p>
                كل 5 أصدقاء يشتركون باشتراك مدفوع
                = شهر مجاني لك.
              </p>

            </div>

          </div>

          {referralLoading ? (

            <div className="referral-loading">
              <div className="subscription-spinner"></div>
              <p>
                جاري تحميل بيانات الدعوات...
              </p>
            </div>

          ) : !referralData.referralCode ? (

            <div className="referral-empty">
              <FaUsers />

              <p>
                لم يتم إنشاء كود الدعوة لحسابك بعد.
              </p>
            </div>

          ) : (

            <>

              {/* Referral Code */}

              <div className="referral-code-card">

                <div className="referral-code-icon">
                  <FaLink />
                </div>

                <div className="referral-code-content">

                  <span>
                    كود الدعوة الخاص بك
                  </span>

                  <strong>
                    {referralData.referralCode}
                  </strong>

                </div>

                <button
                  type="button"
                  className="referral-copy-code"
                  onClick={
                    handleCopyReferralCode
                  }
                >
                  <FaCopy />
                  <span>
                    نسخ الكود
                  </span>
                </button>

              </div>

              {/* Referral Link */}

              <div className="referral-link-box">

                <div className="referral-link-title">

                  <FaLink />

                  <span>
                    رابط الدعوة الخاص بك
                  </span>

                </div>

                <div className="referral-link-row">

                  <input
                    type="text"
                    value={referralLink}
                    readOnly
                  />

                  <div className="referral-link-actions">

                    <button
                      type="button"
                      className="referral-copy-button"
                      onClick={handleCopyReferralLink}
                    >
                      <FaCopy />
                      <span>نسخ</span>
                    </button>

                    <button
                      type="button"
                      className="referral-share-button"
                      onClick={handleShareReferralLink}
                    >
                      <FaShareAlt />
                      <span>مشاركة</span>
                    </button>

                  </div>

                </div>

                <p>
                  أرسل هذا الرابط لأصدقائك. عند
                  اشتراكهم بشكل مدفوع سيتم احتساب
                  الإحالة لك.
                </p>

              </div>

              {/* Stats */}

              <div className="referral-stats-grid">

                <div className="referral-stat-card">

                  <div className="referral-stat-icon completed">
                    <FaCheckCircle />
                  </div>

                  <div>

                    <span>
                      إحالات مكتملة
                    </span>

                    <strong>
                      {
                        referralData.completedReferrals
                      }
                    </strong>

                  </div>

                </div>

                <div className="referral-stat-card">

                  <div className="referral-stat-icon pending">
                    <FaHourglassHalf />
                  </div>

                  <div>

                    <span>
                      في انتظار الاشتراك
                    </span>

                    <strong>
                      {
                        referralData.pendingReferrals
                      }
                    </strong>

                  </div>

                </div>

                <div className="referral-stat-card">

                  <div className="referral-stat-icon reward">
                    <FaGift />
                  </div>

                  <div>

                    <span>
                      شهور مجانية
                    </span>

                    <strong>
                      {
                        referralData.earnedFreeMonths
                      }
                    </strong>

                  </div>

                </div>

              </div>

              {/* Progress */}

              <div className="referral-progress-card">

                <div className="referral-progress-header">

                  <div>

                    <span>
                      التقدم نحو الشهر المجاني القادم
                    </span>

                    <strong>
                      {
                        referralData.completedReferrals %
                        5
                      }{" "}
                      / 5
                    </strong>

                  </div>

                  <FaGift />

                </div>

                <div className="referral-progress-bar">

                  <div
                    className="referral-progress-fill"
                    style={{
                      width: `${referralProgress}%`,
                    }}
                  />

                </div>

                <p>
                  {referralData.referralsUntilNextReward ===
                  5
                    ? "أكمل 5 إحالات مدفوعة لتحصل على شهر مجاني."
                    : `متبقي ${referralData.referralsUntilNextReward} إحالات مدفوعة للحصول على شهر مجاني.`}
                </p>

              </div>

              {/* Referral List */}

              <div className="referral-list">

                <div className="referral-list-header">

                  <div>

                    <span>
                      سجل الدعوات
                    </span>

                    <h3>
                      أصدقاؤك المدعوون
                    </h3>

                  </div>

                  <FaUsers />

                </div>

                {referralData.referrals.length ===
                0 ? (

                  <div className="referral-list-empty">

                    <FaUsers />

                    <p>
                      لم تقم بدعوة أي شخص حتى الآن.
                    </p>

                  </div>

                ) : (

                  <div className="referral-list-items">

                    {referralData.referrals.map(
                      (referral) => {

                        const completed =
                          referral.status ===
                          "completed";

                        return (
                          <div
                            className="referral-item"
                            key={referral.id}
                          >

                            <div className="referral-user">

                              {referral.profile
                                ?.avatar_url ? (

                                <img
                                  src={
                                    referral.profile
                                      .avatar_url
                                  }
                                  alt=""
                                />

                              ) : (

                                <div className="referral-avatar-placeholder">
                                  <FaUsers />
                                </div>

                              )}

                              <div>

                                <strong>
                                  {referral.profile
                                    ?.full_name ||
                                    "طالب جديد"}
                                </strong>

                                <span>
                                  سجل في{" "}
                                  {formatDate(
                                    referral.registered_at?.split(
                                      "T"
                                    )[0]
                                  )}
                                </span>

                              </div>

                            </div>

                            <div
                              className={`referral-status ${
                                completed
                                  ? "completed"
                                  : "pending"
                              }`}
                            >

                              {completed ? (
                                <>
                                  <FaCheckCircle />
                                  <span>
                                    اشترك
                                  </span>
                                </>
                              ) : (
                                <>
                                  <FaHourglassHalf />
                                  <span>
                                    في انتظار الاشتراك
                                  </span>
                                </>
                              )}

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                )}

              </div>

            </>

          )}

        </section>

        {/* ======================================
            Plans
        ====================================== */}

        <section className="plans-section">

          <div className="section-heading">

            <span>
              خيارات الاشتراك
            </span>

            <h2>
              باقات الاشتراك
            </h2>

            <p>
              اختر المدة المناسبة واستفد من الأسعار
              المخفضة للباقات الأطول.
            </p>

          </div>

          <div className="plans-grid">

            {PLANS.map((plan) => {

              const selected =
                selectedPlan.id === plan.id;

              return (
                <button
                  key={plan.id}
                  type="button"
                  className={`plan-card ${
                    selected
                      ? "selected"
                      : ""
                  } ${
                    plan.popular
                      ? "popular"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedPlan(plan)
                  }
                >

                  {plan.discount > 0 && (
                    <span className="discount-badge">
                      خصم {plan.discount}%
                    </span>
                  )}

                  {plan.popular && (
                    <span className="popular-badge">
                      الأكثر اختيارًا
                    </span>
                  )}

                  <div className="plan-radio">
                    {selected && (
                      <span></span>
                    )}
                  </div>

                  <div className="plan-icon">
                    {plan.id === "yearly" ? (
                      <FaCrown />
                    ) : (
                      <FaCreditCard />
                    )}
                  </div>

                  <h3>
                    {plan.name}
                  </h3>

                  <p className="plan-description">
                    {plan.description}
                  </p>

                  <div className="plan-price">

                    <strong>
                      {plan.price}
                    </strong>

                    <span>
                      جنيه
                    </span>

                  </div>

                  {plan.discount > 0 && (
                    <div className="original-price">

                      السعر الأساسي{" "}

                      <del>
                        {plan.originalPrice}
                      </del>{" "}

                      جنيه

                    </div>
                  )}

                  <div className="plan-duration">

                    <FaClock />

                    <span>
                      مدة الاشتراك:{" "}
                      {plan.duration} يوم
                    </span>

                  </div>

                  <div className="plan-features">

                    <div>
                      <FaCheck />
                      <span>
                        وصول كامل للمنصة
                      </span>
                    </div>

                    <div>
                      <FaCheck />
                      <span>
                        جميع أدوات المذاكرة
                      </span>
                    </div>

                    <div>
                      <FaCheck />
                      <span>
                        متابعة التقدم الدراسي
                      </span>
                    </div>

                    <div>
                      <FaCheck />
                      <span>
                        بدون إعلانات مزعجة
                      </span>
                    </div>

                  </div>

                </button>
              );
            })}

          </div>

        </section>

        {/* ======================================
            Selected Plan
        ====================================== */}

        <section className="selected-plan-section">

          <div className="selected-plan-info">

            <div className="selected-plan-icon">
              <FaBolt />
            </div>

            <div>

              <span>
                الباقة المحددة
              </span>

              <h3>
                {selectedPlan.name}
              </h3>

            </div>

          </div>

          <div className="selected-plan-price">

            {selectedPlan.discount > 0 && (
              <span>
                توفير {selectedPlan.discount}%
              </span>
            )}

            <strong>
              {selectedPlan.price} جنيه
            </strong>

          </div>

        </section>

        {/* ======================================
            Payment
        ====================================== */}

        <section className="payment-section">

          <div className="payment-header">

            <div className="payment-icon">
              <FaCreditCard />
            </div>

            <div>

              <span>
                طريقة الدفع
              </span>

              <h2>
                الدفع عن طريق Vodafone Cash
              </h2>

            </div>

          </div>

          <div className="payment-content">

            <div className="payment-number-box">

              <div className="cash-logo">
                VODAFONE
                <small>
                  CASH
                </small>
              </div>

              <span>
                رقم Vodafone Cash
              </span>

              <strong>
                {CASH_NUMBER}
              </strong>

              <small>
                يتم تحويل قيمة الباقة إلى هذا الرقم
              </small>

            </div>

            <div className="payment-steps">

              <div className="payment-step">

                <span>1</span>

                <div>

                  <strong>
                    تحديد الباقة
                  </strong>

                  <p>
                    الباقة المحددة:{" "}
                    <b>
                      {selectedPlan.name}
                    </b>
                  </p>

                </div>

              </div>

              <div className="payment-step">

                <span>2</span>

                <div>

                  <strong>
                    تحويل المبلغ
                  </strong>

                  <p>
                    المبلغ المطلوب:{" "}
                    <b>
                      {selectedPlan.price}
                      جنيه
                    </b>
                  </p>

                </div>

              </div>

              <div className="payment-step">

                <span>3</span>

                <div>

                  <strong>
                    إرسال صورة التحويل
                  </strong>

                  <p>
                    يتم إرسال صورة التحويل عبر
                    WhatsApp لمراجعة الطلب.
                  </p>

                </div>

              </div>

            </div>

          </div>

          <button
            type="button"
            className="whatsapp-button"
            onClick={handleWhatsApp}
          >

            <FaWhatsapp />

            <span>

              التواصل عبر WhatsApp

              <small>
                إرسال طلب تفعيل الاشتراك
              </small>

            </span>

          </button>

        </section>

        {/* ======================================
            Note
        ====================================== */}

        <section className="subscription-note">

          <div className="note-icon">
            <FaShieldAlt />
          </div>

          <div>

            <strong>
              تفعيل الاشتراك يدويًا
            </strong>

            <p>
              بعد تحويل قيمة الباقة، يتم إرسال صورة
              التحويل عبر WhatsApp. تتم مراجعة العملية
              وتفعيل الاشتراك يدويًا من الإدارة.
            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Subscription;