import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaCrown,
  FaSearch,
  FaUser,
  FaUsers,
  FaTimesCircle,
  FaSyncAlt,
} from "react-icons/fa";
import Header from "../../components/Header/Header";
import { supabase } from "../../utils/supabaseClient";
import "./AdminSubscriptions.css";
const PAGE_SIZE = 8;
const PLANS = [
  {
    days: 30,
    price: 50,
    title: "شهري",
  },
  {
    days: 90,
    price: 130,
    title: "3 شهور",
  },
  {
    days: 180,
    price: 230,
    title: "6 شهور",
  },
  {
    days: 365,
    price: 400,
    title: "سنوي",
  },
];
const AdminSubscriptions = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activating, setActivating] = useState(false);
  // ==========================================
  // جلب الطلاب والاشتراكات
  // ==========================================
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      // الطلاب
      const {
        data: studentsData,
        error: studentsError,
      } = await supabase
        .from("student_profiles")
        .select(
          `
          id,
          user_id,
          student_code,
          full_name,
          avatar_url,
          section,
          phone
        `
        )
        .order("created_at", { ascending: false });
      if (studentsError) {
        throw studentsError;
      }
      // الاشتراكات
      const {
        data: subscriptionsData,
        error: subscriptionsError,
      } = await supabase
        .from("subscriptions")
        .select("*")
        .order("end_date", { ascending: false });
      if (subscriptionsError) {
        throw subscriptionsError;
      }
      setStudents(studentsData || []);
      setSubscriptions(subscriptionsData || []);
    } catch (error) {
      console.error("Admin subscriptions error:", error);
      Swal.fire({
        icon: "error",
        title: "حدث خطأ",
        text: "لم نتمكن من تحميل بيانات الاشتراكات",
        confirmButtonText: "حسنًا",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  // ==========================================
  // تاريخ اليوم
  // ==========================================
  const today = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);
  // ==========================================
  // آخر اشتراك لكل طالب
  // ==========================================
  const studentsWithSubscriptions = useMemo(() => {
    return students.map((student) => {
      const studentSubscriptions = subscriptions
        .filter((subscription) => subscription.user_id === student.user_id)
        .sort((a, b) => {
          return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
        });
      const latestSubscription = studentSubscriptions[0] || null;
      let subscriptionStatus = "none";
      if (latestSubscription) {
        if (latestSubscription.status === "active" && latestSubscription.end_date >= today) {
          subscriptionStatus = "active";
        } else if (latestSubscription.end_date < today) {
          subscriptionStatus = "expired";
        } else if (latestSubscription.status === "cancelled") {
          subscriptionStatus = "cancelled";
        }
      }
      return {
        ...student,
        latestSubscription,
        subscriptionStatus,
      };
    });
  }, [students, subscriptions, today]);
  // ==========================================
  // الإحصائيات
  // ==========================================
  const stats = useMemo(() => {
    const active = studentsWithSubscriptions.filter((student) => student.subscriptionStatus === "active").length;
    const expired = studentsWithSubscriptions.filter((student) => student.subscriptionStatus === "expired").length;
    const noSubscription = studentsWithSubscriptions.filter((student) => student.subscriptionStatus === "none").length;
    const trial = subscriptions.filter(
      (subscription) =>
        subscription.subscription_type === "trial" &&
        subscription.status === "active" &&
        subscription.end_date >= today
    ).length;
    return {
      total: students.length,
      active,
      expired,
      noSubscription,
      trial,
    };
  }, [students, studentsWithSubscriptions, subscriptions, today]);
  // ==========================================
  // الفلترة
  // ==========================================
  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return studentsWithSubscriptions.filter((student) => {
      const matchesSearch =
        !normalizedSearch ||
        student.full_name?.toLowerCase().includes(normalizedSearch) ||
        student.student_code?.toLowerCase().includes(normalizedSearch) ||
        student.phone?.toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" ||
        student.subscriptionStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [studentsWithSubscriptions, search, statusFilter]);
  // ==========================================
  // Pagination
  // ==========================================
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, page]);
  // ==========================================
  // فتح نافذة التفعيل
  // ==========================================
  const openActivation = (student) => {
    setSelectedStudent(student);
    setSelectedPlan(null);
  };
  // ==========================================
  // تفعيل الاشتراك
  // ==========================================
  const activateSubscription = async () => {
    if (!selectedStudent) {
      return;
    }
    if (!selectedPlan) {
      Swal.fire({
        icon: "warning",
        title: "اختر مدة الاشتراك",
        text: "يجب اختيار إحدى الباقات أولًا",
        confirmButtonText: "حسنًا",
      });
      return;
    }
    const confirmResult = await Swal.fire({
      icon: "question",
      title: "تأكيد تفعيل الاشتراك",
      html: `
        <div style="direction: rtl; text-align: right;">
          <p>سيتم تفعيل اشتراك للطالب:</p>
          <strong>${selectedStudent.full_name}</strong>
          <p style="margin-top: 10px;">
            الباقة:
            <strong>${selectedPlan.title}</strong>
          </p>
          <p>
            المدة:
            <strong>${selectedPlan.days} يوم</strong>
          </p>
          <p>
            المبلغ:
            <strong>${selectedPlan.price} جنيه</strong>
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "تفعيل الاشتراك",
      cancelButtonText: "إلغاء",
      reverseButtons: true,
    });
    if (!confirmResult.isConfirmed) {
      return;
    }
    try {
      setActivating(true);
      const { data, error } = await supabase.rpc(
        "activate_student_subscription",
        {
          p_user_id: selectedStudent.user_id,
          p_duration_days: selectedPlan.days,
          p_amount: selectedPlan.price,
          p_notes: `تفعيل يدوي - ${selectedPlan.title}`,
        }
      );
      if (error) {
        throw error;
      }
      await Swal.fire({
        icon: "success",
        title: "تم تفعيل الاشتراك",
        text: "تم إضافة الاشتراك للطالب بنجاح",
        confirmButtonText: "حسنًا",
      });
      setSelectedStudent(null);
      setSelectedPlan(null);
      await fetchData();
    } catch (error) {
      console.error("Activate subscription error:", error);
      Swal.fire({
        icon: "error",
        title: "فشل التفعيل",
        text: error?.message || "حدث خطأ أثناء تفعيل الاشتراك",
        confirmButtonText: "حسنًا",
      });
    } finally {
      setActivating(false);
    }
  };
  // ==========================================
  // Helpers
  // ==========================================
  const formatDate = (date) => {
    if (!date) {
      return "-";
    }
    return new Date(`${date}T00:00:00`).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  const getRemainingDays = (endDate) => {
    if (!endDate) {
      return 0;
    }
    const end = new Date(`${endDate}T23:59:59`);
    const now = new Date();
    const difference = end.getTime() - now.getTime();
    if (difference <= 0) {
      return 0;
    }
    return Math.ceil(difference / (1000 * 60 * 60 * 24));
  };
  const getStatusInfo = (student) => {
    if (student.subscriptionStatus === "active") {
      const subscription = student.latestSubscription;
      if (subscription?.subscription_type === "trial") {
        return {
          text: "تجربة مجانية",
          className: "status-trial",
          icon: <FaClock />,
        };
      }
      return {
        text: "نشط",
        className: "status-active",
        icon: <FaCheckCircle />,
      };
    }
    if (student.subscriptionStatus === "expired") {
      return {
        text: "منتهي",
        className: "status-expired",
        icon: <FaTimesCircle />,
      };
    }
    if (student.subscriptionStatus === "cancelled") {
      return {
        text: "ملغي",
        className: "status-cancelled",
        icon: <FaTimesCircle />,
      };
    }
    return {
      text: "بدون اشتراك",
      className: "status-none",
      icon: <FaCreditCard />,
    };
  };
  // ==========================================
  // Loading
  // ==========================================
  if (loading) {
    return (
      <div className="admin-subscriptions-page">
        <Header />
        <div className="admin-subscriptions-loading">
          <div className="admin-loading-spinner"></div>
          <p>جاري تحميل بيانات الاشتراكات...</p>
        </div>
      </div>
    );
  }
  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="admin-subscriptions-page">
      <Header />
      <main className="admin-subscriptions-container">
        {/* ========================================
            Stats
        ======================================== */}
        <section className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <FaUsers />
            </div>
            <div>
              <span>إجمالي الطلاب</span>
              <strong>{stats.total}</strong>
            </div>
          </div>
          <div className="admin-stat-card active">
            <div className="admin-stat-icon">
              <FaCheckCircle />
            </div>
            <div>
              <span>اشتراكات نشطة</span>
              <strong>{stats.active}</strong>
            </div>
          </div>
          <div className="admin-stat-card expired">
            <div className="admin-stat-icon">
              <FaTimesCircle />
            </div>
            <div>
              <span>اشتراكات منتهية</span>
              <strong>{stats.expired}</strong>
            </div>
          </div>
          <div className="admin-stat-card trial">
            <div className="admin-stat-icon">
              <FaClock />
            </div>
            <div>
              <span>تجارب مجانية</span>
              <strong>{stats.trial}</strong>
            </div>
          </div>
          <div className="admin-stat-card none">
            <div className="admin-stat-icon">
              <FaCreditCard />
            </div>
            <div>
              <span>بدون اشتراك</span>
              <strong>{stats.noSubscription}</strong>
            </div>
          </div>
        </section>
        {/* ========================================
            Filters
        ======================================== */}
        <section className="admin-filters">
          <div className="search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="ابحث باسم الطالب أو الكود أو الهاتف..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="status-filter">
            <button
              className={statusFilter === "all" ? "active" : ""}
              onClick={() => {
                setStatusFilter("all");
                setPage(1);
              }}
            >
              الكل
            </button>
            <button
              className={
                statusFilter === "active" ? "active" : ""
              }
              onClick={() => {
                setStatusFilter("active");
                setPage(1);
              }}
            >
              نشط
            </button>
            <button
              className={
                statusFilter === "expired" ? "active" : ""
              }
              onClick={() => {
                setStatusFilter("expired");
                setPage(1);
              }}
            >
              منتهي
            </button>
            <button
              className={
                statusFilter === "none" ? "active" : ""
              }
              onClick={() => {
                setStatusFilter("none");
                setPage(1);
              }}
            >
              بدون اشتراك
            </button>
          </div>
        </section>
        {/* ========================================
            Students Table
        ======================================== */}
        <section className="students-section">
          <div className="students-section-header">
            <div>
              <h2><FaUsers />الطلاب</h2>
              <span>{filteredStudents.length} طالب</span>
            </div>
          </div>
          {paginatedStudents.length === 0 ? (
            <div className="empty-state">
              <FaUser />
              <h3>لا يوجد طلاب</h3>
              <p>لا توجد نتائج مطابقة للبحث أو الفلتر الحالي.</p>
            </div>
          ) : (
            <div className="students-table-wrapper">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>الحالة</th>
                    <th>نوع الاشتراك</th>
                    <th>تاريخ البداية</th>
                    <th>تاريخ الانتهاء</th>
                    <th>المتبقي</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student) => {
                    const status = getStatusInfo(student);
                    const subscription = student.latestSubscription;
                    const remainingDays =
                      subscription &&
                      student.subscriptionStatus === "active"
                        ? getRemainingDays(subscription.end_date)
                        : 0;
                    return (
                      <tr key={student.user_id}>
                        {/* الطالب */}
                        <td>
                          <div className="student-info">
                            <img
                              src={
                                student.avatar_url ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  student.full_name || "Student"
                                )}&background=random`
                              }
                              alt={student.full_name}
                            />
                            <div>
                              <strong>{student.full_name}</strong>
                              <span>{student.student_code}</span>
                            </div>
                          </div>
                        </td>
                        {/* الحالة */}
                        <td>
                          <span className={`subscription-status ${status.className}`}>
                            {status.icon}
                            {status.text}
                          </span>
                        </td>
                        {/* النوع */}
                        <td>
                          {subscription ? (
                            <span
                              className={
                                subscription.subscription_type ===
                                "trial"
                                  ? "subscription-type trial"
                                  : "subscription-type paid"
                              }
                            >
                              {subscription.subscription_type === "trial" ? "تجربة" : "مدفوع"}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        {/* البداية */}
                        <td>
                          {subscription
                            ? formatDate(subscription.start_date)
                            : "-"}
                        </td>
                        {/* النهاية */}
                        <td>
                          {subscription
                            ? formatDate(subscription.end_date)
                            : "-"}
                        </td>
                        {/* المتبقي */}
                        <td>
                          {student.subscriptionStatus === "active" ? (
                            <span className="remaining-days">{remainingDays} يوم</span>
                          ) : (
                            <span className="no-remaining">-</span>
                          )}
                        </td>
                        {/* الإجراء */}
                        <td>
                          <button
                            className="activate-button"
                            onClick={() => openActivation(student)}
                          >
                            <FaCreditCard />
                            تفعيل اشتراك
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage((prev) => prev - 1)}
              >
                السابق
              </button>
              <span>صفحة {page} من {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                التالي
              </button>
            </div>
          )}
        </section>
      </main>
      {/* ========================================
          Activation Modal
      ======================================== */}
      {selectedStudent && (
        <div
          className="subscription-modal-overlay"
          onClick={() => {
            if (!activating) {
              setSelectedStudent(null);
            }
          }}
        >
          <div
            className="subscription-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>تفعيل اشتراك</h2>
                <p>{selectedStudent.full_name}</p>
              </div>
              <button
                onClick={() => {
                  if (!activating) {
                    setSelectedStudent(null);
                  }
                }}
                disabled={activating}
              >
                ×
              </button>
            </div>
            {/* Current Subscription */}
            {selectedStudent.latestSubscription && (
              <div className="current-subscription">
                <div className="current-subscription-title">
                  <FaCalendarAlt />
                  الاشتراك الحالي
                </div>
                <div className="current-subscription-info">
                  <span>
                    النهاية:
                    <strong>{formatDate(selectedStudent.latestSubscription.end_date)}</strong>
                  </span>
                  <span>
                    الحالة:
                    <strong>
                      {selectedStudent.subscriptionStatus === "active"
                        ? "نشط"
                        : "منتهي"}
                    </strong>
                  </span>
                </div>
                {selectedStudent.subscriptionStatus === "active" && (
                  <p>سيتم إضافة مدة الاشتراك الجديدة بعد تاريخ الانتهاء الحالي.</p>
                )}
              </div>
            )}
            {/* Plans */}
            <div className="plans-title">اختر الباقة</div>
            <div className="plans-grid">
              {PLANS.map((plan) => {
                const selected = selectedPlan?.days === plan.days;
                return (
                  <button
                    key={plan.days}
                    className={`plan-card ${selected ? "selected" : ""}`}
                    onClick={() => setSelectedPlan(plan)}
                    disabled={activating}
                  >
                    {selected && (
                      <div className="plan-selected">
                        <FaCheckCircle />
                      </div>
                    )}
                    <span className="plan-name">{plan.title}</span>
                    <strong className="plan-price">
                      {plan.price}
                      <small> جنيه</small>
                    </strong>
                    <span className="plan-days">{plan.days} يوم</span>
                  </button>
                );
              })}
            </div>
            {/* Action */}
            <button
              className="confirm-activation-button"
              onClick={activateSubscription}
              disabled={!selectedPlan || activating}
            >
              {activating ? (
                <>
                  <span className="button-spinner"></span>
                  جاري التفعيل...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  تفعيل الاشتراك
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminSubscriptions;