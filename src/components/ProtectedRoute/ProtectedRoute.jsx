import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { supabase } from "../../utils/supabaseClient";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [hasSubscription, setHasSubscription] = useState(false);

  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        setLoading(true);

        // ==========================================
        // 1. الحصول على Session
        // ==========================================

        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "PROTECTED ROUTE SESSION ERROR:",
            sessionError
          );

          if (mounted) {
            setSession(null);
            setHasSubscription(false);
            setLoading(false);
          }

          return;
        }

        // ==========================================
        // 2. المستخدم غير مسجل دخول
        // ==========================================

        if (!currentSession) {
          if (mounted) {
            setSession(null);
            setHasSubscription(false);
            setLoading(false);
          }

          return;
        }

        if (!mounted) return;

        setSession(currentSession);

        // ==========================================
        // 3. صفحة الاشتراك مسموحة دائمًا
        // ==========================================

        const currentPath =
          location.pathname.toLowerCase();

        if (currentPath === "/subscription") {
          setHasSubscription(true);
          setLoading(false);
          return;
        }

        // ==========================================
        // 4. تاريخ اليوم
        // ==========================================

        const today = new Date()
          .toISOString()
          .split("T")[0];

        // ==========================================
        // 5. جلب الاشتراك الحالي
        // ==========================================

        const {
          data: subscription,
          error: subscriptionError,
        } = await supabase
          .from("subscriptions")
          .select(
            `
              id,
              start_date,
              end_date,
              duration_days,
              amount,
              status,
              subscription_type
            `
          )
          .eq(
            "user_id",
            currentSession.user.id
          )
          .eq("status", "active")
          .gte("end_date", today)
          .order("end_date", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (subscriptionError) {
          console.error(
            "PROTECTED ROUTE SUBSCRIPTION ERROR:",
            subscriptionError
          );

          if (mounted) {
            setHasSubscription(false);
            setLoading(false);
          }

          return;
        }

        // ==========================================
        // 6. لا يوجد اشتراك
        // ==========================================

        if (!subscription) {
          console.log(
            "NO ACTIVE SUBSCRIPTION"
          );

          if (mounted) {
            setHasSubscription(false);
            setLoading(false);
          }

          return;
        }

        // ==========================================
        // 7. يوجد اشتراك ساري
        // ==========================================

        console.log(
          "ACTIVE SUBSCRIPTION:",
          subscription
        );

        if (mounted) {
          setHasSubscription(true);
          setLoading(false);
        }

        // ==========================================
        // 8. حساب الأيام المتبقية
        // ==========================================

        const todayDate = new Date(
          `${today}T00:00:00`
        );

        const endDate = new Date(
          `${subscription.end_date}T00:00:00`
        );

        const difference =
          endDate.getTime() -
          todayDate.getTime();

        const remainingDays = Math.round(
          difference /
            (1000 * 60 * 60 * 24)
        );

        console.log(
          "================================"
        );

        console.log(
          "SUBSCRIPTION WARNING CHECK"
        );

        console.log(
          "TODAY:",
          today
        );

        console.log(
          "END DATE:",
          subscription.end_date
        );

        console.log(
          "REMAINING DAYS:",
          remainingDays
        );

        console.log(
          "================================"
        );

        // ==========================================
        // 9. التحذير
        // ==========================================

        if (
          remainingDays <= 3 &&
          remainingDays >= 0
        ) {
          // مفتاح خاص بالمستخدم + الاشتراك
          const warningKey =
            `subscription_warning_${currentSession.user.id}_${subscription.id}`;

          const alreadyShown =
            sessionStorage.getItem(
              warningKey
            );

          console.log(
            "WARNING ALREADY SHOWN:",
            alreadyShown
          );

          // لو ظهر قبل كده في نفس فتح التطبيق
          // لا يظهر مرة أخرى
          if (alreadyShown) {
            return;
          }

          // نسجل أنه ظهر
          sessionStorage.setItem(
            warningKey,
            "true"
          );

          // ننتظر تحميل الصفحة
          setTimeout(() => {
            if (!mounted) return;

            let title = "";
            let message = "";

            if (remainingDays === 3) {
              title =
                "⚠️ اشتراكك على وشك الانتهاء";

              message = `
                <div style="
                  direction: rtl;
                  font-family: Cairo, sans-serif;
                  line-height: 2;
                  font-size: 16px;
                ">
                  متبقي
                  <strong>3 أيام</strong>
                  فقط على انتهاء اشتراكك.
                  <br />
                  جدد اشتراكك الآن حتى تستمر في رحلتك الدراسية بدون توقف.
                </div>
              `;
            } else if (
              remainingDays === 2
            ) {
              title =
                "⚠️ تبقى يومان على انتهاء اشتراكك";

              message = `
                <div style="
                  direction: rtl;
                  font-family: Cairo, sans-serif;
                  line-height: 2;
                  font-size: 16px;
                ">
                  متبقي
                  <strong>يومان فقط</strong>
                  على انتهاء اشتراكك.
                  <br />
                  ننصحك بتجديد الاشتراك الآن.
                </div>
              `;
            } else if (
              remainingDays === 1
            ) {
              title =
                "🚨 اشتراكك سينتهي غدًا";

              message = `
                <div style="
                  direction: rtl;
                  font-family: Cairo, sans-serif;
                  line-height: 2;
                  font-size: 16px;
                ">
                  متبقي
                  <strong>يوم واحد فقط</strong>
                  على انتهاء اشتراكك.
                  <br />
                  جدد اشتراكك الآن حتى لا يتوقف وصولك للمحتوى.
                </div>
              `;
            } else if (
              remainingDays === 0
            ) {
              title =
                "🚨 اشتراكك ينتهي اليوم";

              message = `
                <div style="
                  direction: rtl;
                  font-family: Cairo, sans-serif;
                  line-height: 2;
                  font-size: 16px;
                ">
                  اشتراكك
                  <strong>ينتهي اليوم</strong>.
                  <br />
                  جدد اشتراكك الآن للاستمرار في استخدام المنصة.
                </div>
              `;
            }

            Swal.fire({
              title,
              html: message,

              icon:
                remainingDays <= 1
                  ? "warning"
                  : "info",

              showCancelButton: true,

              confirmButtonText:
                "تجديد الاشتراك",

              cancelButtonText:
                "لاحقًا",

              reverseButtons: true,

              confirmButtonColor:
                "#2563eb",

              cancelButtonColor:
                "#6b7280",

              allowOutsideClick: true,

              allowEscapeKey: true,

              customClass: {
                popup:
                  "subscription-warning-popup",
              },
            }).then((result) => {
              if (
                result.isConfirmed
              ) {
                window.location.href =
                  "/Subscription";
              }
            });
          }, 1000);
        }
      } catch (error) {
        console.error(
          "PROTECTED ROUTE ERROR:",
          error
        );

        if (mounted) {
          setHasSubscription(false);
          setLoading(false);
        }
      }
    };

    checkAccess();

    // ==========================================
    // مراقبة حالة تسجيل الدخول
    // ==========================================

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (!newSession) {
          setHasSubscription(false);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };

    // مهم:
    // لا نعيد تشغيل الـ effect مع كل تغيير صفحة
    // لأننا نريد التحذير مرة واحدة فقط عند فتح التطبيق
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================
  // Loading
  // ==========================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          direction: "rtl",
          fontFamily:
            "Cairo, sans-serif",
          fontSize: "18px",
        }}
      >
        جاري التحقق من الاشتراك...
      </div>
    );
  }

  // ==========================================
  // غير مسجل دخول
  // ==========================================

  if (!session) {
    return (
      <Navigate
        to="/Login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  // ==========================================
  // الاشتراك منتهي / غير موجود
  // ==========================================

  if (!hasSubscription) {
    return (
      <Navigate
        to="/Subscription"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  // ==========================================
  // الاشتراك ساري
  // ==========================================

  return children;
}

export default ProtectedRoute;