import React, { useEffect, useMemo, useState } from "react";
import {
  FaCheck,
  FaClock,
  FaCreditCard,
  FaCrown,
  FaWhatsapp,
  FaShieldAlt,
  FaBolt,
} from "react-icons/fa";
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

  useEffect(() => {
    fetchSubscription();
  }, []);

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
        console.error("SUBSCRIPTION FETCH ERROR:", error);
        return;
      }
      setSubscription(data);
    } catch (error) {
      console.error("SUBSCRIPTION PAGE ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscriptionInfo = useMemo(() => {
    if (!subscription) {
      return {
        type: "none",
        title: "لا يوجد اشتراك",
        message: "لا يوجد اشتراك حالي. يمكن تفعيل إحدى الباقات المتاحة.",
        remaining: 0,
        active: false,
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(`${subscription.end_date}T00:00:00`);
    endDate.setHours(0, 0, 0, 0);
    const difference = endDate.getTime() - today.getTime();
    const remaining = Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
    const active = subscription.status === "active" && endDate.getTime() >= today.getTime();
    if (subscription.subscription_type === "trial" && active) {
      return {
        type: "trial",
        title: "الفترة التجريبية",
        message: "الحساب حاليًا ضمن الفترة التجريبية المجانية.",
        remaining,
        active: true,
      };
    }
    if (active) {
      return {
        type: "active",
        title: "الاشتراك فعال",
        message: "الاشتراك فعال ويمكن استخدام جميع أدوات Study Journey.",
        remaining,
        active: true,
      };
    }
    return {
      type: "expired",
      title: "انتهى الاشتراك",
      message: "انتهت مدة الاشتراك. يمكن تفعيل باقة جديدة لمواصلة استخدام المنصة.",
      remaining: 0,
      active: false,
    };
  }, [subscription]);

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(`${date}T00:00:00`).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleWhatsApp = () => {
    const message = `مرحبًا، أرغب في الاشتراك في Study Journey.

الباقة: ${selectedPlan.name}
المدة: ${selectedPlan.duration} يوم
السعر: ${selectedPlan.price} جنيه
الخصم: ${selectedPlan.discount > 0 ? `${selectedPlan.discount}%` : "بدون خصم"}

رقم Vodafone Cash للتحويل:
${CASH_NUMBER}

سيتم إرسال صورة التحويل لتفعيل الاشتراك.`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="subscription-page">
        <Header />
        <div className="subscription-loading">
          <div className="subscription-spinner"></div>
          <p>جاري تحميل بيانات الاشتراك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-page">
      <main className="subscription-container">
        <Header />
        {/* ======================================
            Hero
        ====================================== */}
        <section className="subscription-hero">
          <div className="subscription-hero-icon"><FaCrown /></div>
          <div className="subscription-hero-content">
            <span className="subscription-eyebrow">Study Journey Premium</span>
            <h1>استمر في رحلتك الدراسية بدون توقف</h1>
            <p>باقات مرنة للوصول إلى جميع أدوات Study Journey.</p>
          </div>
        </section>
        {/* ======================================
            Current Subscription
        ====================================== */}
        <section className="current-subscription-card">
          <div className="current-subscription-header">
            <div className="current-subscription-title">
              <span className="current-icon"><FaClock /></span>
              <div>
                <span>حالة الاشتراك الحالية</span>
                <h2>{subscriptionInfo.title}</h2>
              </div>
            </div>
            <span className={`subscription-status ${subscriptionInfo.active ? "active" : "expired"}`}>
              {subscriptionInfo.active ? "فعال" : "منتهي"}
            </span>
          </div>
          <div className="current-subscription-content">
            <div className="subscription-stat">
              <span>تاريخ البداية</span>
              <strong>{formatDate(subscription?.start_date)}</strong>
            </div>
            <div className="subscription-stat">
              <span>تاريخ الانتهاء</span>
              <strong>{formatDate(subscription?.end_date)}</strong>
            </div>
            <div className="subscription-stat highlight">
              <span>المتبقي</span>
              <strong>{subscriptionInfo.remaining}<small>يوم</small></strong>
            </div>
          </div>
          <p className="current-subscription-message">{subscriptionInfo.message}</p>
        </section>
        {/* ======================================
            Plans
        ====================================== */}
        <section className="plans-section">
          <div className="section-heading">
            <span>خيارات الاشتراك</span>
            <h2>باقات الاشتراك</h2>
            <p>اختر المدة المناسبة واستفد من الأسعار المخفضة للباقات الأطول.</p>
          </div>
          <div className="plans-grid">
            {PLANS.map((plan) => {
              const selected = selectedPlan.id === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  className={`plan-card ${selected ? "selected" : ""} ${plan.popular ? "popular" : ""}`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  {plan.discount > 0 && <span className="discount-badge">خصم {plan.discount}%</span>}
                  {plan.popular && <span className="popular-badge">الأكثر اختيارًا</span>}
                  <div className="plan-radio">{selected && <span></span>}</div>
                  <div className="plan-icon">{plan.id === "yearly" ? <FaCrown /> : <FaCreditCard />}</div>
                  <h3>{plan.name}</h3>
                  <p className="plan-description">{plan.description}</p>
                  <div className="plan-price">
                    <strong>{plan.price}</strong>
                    <span>جنيه</span>
                  </div>
                  {plan.discount > 0 && (
                    <div className="original-price">
                      السعر الأساسي <del>{plan.originalPrice}</del> جنيه
                    </div>
                  )}
                  <div className="plan-duration">
                    <FaClock />
                    <span>مدة الاشتراك: {plan.duration} يوم</span>
                  </div>
                  <div className="plan-features">
                    <div><FaCheck /><span>وصول كامل للمنصة</span></div>
                    <div><FaCheck /><span>جميع أدوات المذاكرة</span></div>
                    <div><FaCheck /><span>متابعة التقدم الدراسي</span></div>
                    <div><FaCheck /><span>بدون إعلانات مزعجة</span></div>
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
            <div className="selected-plan-icon"><FaBolt /></div>
            <div>
              <span>الباقة المحددة</span>
              <h3>{selectedPlan.name}</h3>
            </div>
          </div>
          <div className="selected-plan-price">
            {selectedPlan.discount > 0 && <span>توفير {selectedPlan.discount}%</span>}
            <strong>{selectedPlan.price} جنيه</strong>
          </div>
        </section>
        {/* ======================================
            Payment
        ====================================== */}
        <section className="payment-section">
          <div className="payment-header">
            <div className="payment-icon"><FaCreditCard /></div>
            <div>
              <span>طريقة الدفع</span>
              <h2>الدفع عن طريق Vodafone Cash</h2>
            </div>
          </div>
          <div className="payment-content">
            <div className="payment-number-box">
              <div className="cash-logo">VODAFONE<small>CASH</small></div>
              <span>رقم Vodafone Cash</span>
              <strong>{CASH_NUMBER}</strong>
              <small>يتم تحويل قيمة الباقة إلى هذا الرقم</small>
            </div>
            <div className="payment-steps">
              <div className="payment-step">
                <span>1</span>
                <div>
                  <strong>تحديد الباقة</strong>
                  <p>الباقة المحددة: <b>{selectedPlan.name}</b></p>
                </div>
              </div>
              <div className="payment-step">
                <span>2</span>
                <div>
                  <strong>تحويل المبلغ</strong>
                  <p>المبلغ المطلوب: <b>{selectedPlan.price}جنيه</b></p>
                </div>
              </div>
              <div className="payment-step">
                <span>3</span>
                <div>
                  <strong>إرسال صورة التحويل</strong>
                  <p>يتم إرسال صورة التحويل عبر WhatsApp لمراجعة الطلب.</p>
                </div>
              </div>
            </div>
          </div>
          <button type="button" className="whatsapp-button" onClick={handleWhatsApp}>
            <FaWhatsapp />
            <span>التواصل عبر WhatsApp<small>إرسال طلب تفعيل الاشتراك</small></span>
          </button>
        </section>
        {/* ======================================
            Note
        ====================================== */}
        <section className="subscription-note">
          <div className="note-icon"><FaShieldAlt /></div>
          <div>
            <strong>تفعيل الاشتراك يدويًا</strong>
            <p>بعد تحويل قيمة الباقة، يتم إرسال صورة التحويل عبر WhatsApp. تتم مراجعة العملية وتفعيل الاشتراك يدويًا من الإدارة.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Subscription;