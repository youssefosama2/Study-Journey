import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";

const AdminRoute = ({ children }) => {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async () => {
      try {
        setLoading(true);

        // =========================================
        // GET CURRENT SESSION
        // =========================================

        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "SESSION ERROR:",
            sessionError
          );

          if (mounted) {
            setSession(null);
            setIsAdmin(false);
            setLoading(false);
          }

          return;
        }

        // =========================================
        // NO SESSION
        // =========================================

        if (!currentSession) {
          if (mounted) {
            setSession(null);
            setIsAdmin(false);
            setLoading(false);
          }

          return;
        }

        if (mounted) {
          setSession(currentSession);
        }

        // =========================================
        // CHECK ADMIN FROM SUPABASE RPC
        // =========================================

        const {
          data: adminResult,
          error: adminError,
        } = await supabase.rpc("is_admin");


        // =========================================
        // RPC ERROR
        // =========================================

        if (adminError) {
          console.error(
            "ADMIN CHECK ERROR:",
            adminError
          );

          if (mounted) {
            setIsAdmin(false);
            setLoading(false);
          }

          return;
        }

        // =========================================
        // SAVE ADMIN STATUS
        // =========================================

        if (mounted) {
          setIsAdmin(adminResult === true);
          setLoading(false);
        }
      } catch (error) {
        console.error(
          "ADMIN ROUTE ERROR:",
          error
        );

        if (mounted) {
          setSession(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    };

    // Initial check
    checkAdmin();

    // =========================================
    // LISTEN FOR AUTH CHANGES
    // =========================================

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async () => {
        await checkAdmin();
      }
    );

    // =========================================
    // CLEANUP
    // =========================================

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          direction: "rtl",
          fontFamily: "Cairo, sans-serif",
          fontSize: "18px",
        }}
      >
        جاري التحقق من الصلاحيات...
      </div>
    );
  }

  // =========================================
  // NOT LOGGED IN
  // =========================================

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

  // =========================================
  // LOGGED IN BUT NOT ADMIN
  // =========================================

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  // =========================================
  // ADMIN
  // =========================================

  return children;
};

export default AdminRoute;