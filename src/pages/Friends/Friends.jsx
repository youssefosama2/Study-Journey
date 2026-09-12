import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Swal from "sweetalert2";
import {
  FaUsers,
  FaUserFriends,
  FaStar,
  FaTrophy,
  FaSearch,
  FaBookOpen,
  FaBullseye,
  FaFire,
  FaChartLine,
  FaUserPlus,
  FaUserMinus,
  FaCheck,
  FaTimes,
  FaChevronDown,
  FaMedal,
  FaPlus,
  FaBolt,
  FaClock,
  FaGift,
  FaUserCheck,
  FaCalendarAlt,
  FaChevronRight,
  FaCrown,
  FaRunning,
} from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import Header from "../../components/Header/Header";
import { supabase } from "../../utils/supabaseClient";
import "./Friends.css";
/* =========================================================
   Helpers
========================================================= */
const getToday = () => {
  return new Date().toISOString().split("T")[0];
};
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
};
const getAvatar = (profile) => {
  if (profile?.avatar_url) {
    return profile.avatar_url;
  }
  const name = profile?.full_name || "Student";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=6c63ff&color=fff&size=150`;
};
const getChallengeTypeData = (type) => {
  const types = {
    focus: {
      label: "تركيز",
      icon: FaFire,
      theme: "orange",
      reward: 100,
      unit: "دقيقة",
      defaultTarget: 300,
    },
    lessons: {
      label: "دروس",
      icon: FaBookOpen,
      theme: "purple",
      reward: 150,
      unit: "درس",
      defaultTarget: 10,
    },
    points: {
      label: "نقاط",
      icon: FaStar,
      theme: "gold",
      reward: 200,
      unit: "نقطة",
      defaultTarget: 500,
    },
    streak: {
      label: "استمرارية",
      icon: FaBolt,
      theme: "green",
      reward: 250,
      unit: "يوم",
      defaultTarget: 7,
    },
  };
  return types[type] || types.focus;
};
const getChallengeDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 1;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(1, diff + 1);
};
/* =========================================================
   Component
========================================================= */
const Friends = () => {
  /* =======================================================
     User
  ======================================================= */
  const [userId, setUserId] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  /* =======================================================
     Main Data
  ======================================================= */
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [challengeMembers, setChallengeMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  /* =======================================================
     UI
  ======================================================= */
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [searchedStudent, setSearchedStudent] = useState(null);
  const [searchMessage, setSearchMessage] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /* =======================================================
     Challenge Modal
  ======================================================= */
  const [challengeModal, setChallengeModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challengeForm, setChallengeForm] = useState({
    title: "",
    type: "focus",
    duration: "7",
    target: "300",
  });
  const [selectedInviteFriends, setSelectedInviteFriends] = useState([]);
  /* =======================================================
     Duel Modal
  ======================================================= */
  const [duelForm, setDuelForm] = useState({
    friendId: "",
    goal: "30",
  });
  /* =========================================================
     Load Current User
  ========================================================= */
  const loadCurrentUser = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      console.error("getUser error:", error);
      return null;
    }
    if (!user) {
      console.error("No authenticated user");
      return null;
    }
    setUserId(user.id);
    return user.id;
  }, []);
  /* =========================================================
     Load Profile
  ========================================================= */
  const loadCurrentProfile = useCallback(async (currentUserId) => {
    if (!currentUserId) return null;
    const { data, error } = await supabase
      .from("student_profiles")
      .select("id,user_id,student_code,full_name,avatar_url,section")
      .eq("user_id", currentUserId)
      .maybeSingle();
    if (error) {
      console.error("current profile error:", error);
      return null;
    }
    setCurrentProfile(data || null);
    return data || null;
  }, []);
  /* =========================================================
     Load Friendships
  ========================================================= */
  const loadFriendships = useCallback(
    async (currentUserId) => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from("friendships")
        .select(
          `
          id,
          requester_id,
          addressee_id,
          status,
          requested_at,
          responded_at,
          created_at,
          updated_at
        `
        )
        .or(
          `requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`
        )
        .order("created_at", {
          ascending: false,
        });
      if (error) {
        console.error("friendships error:", error);
        return [];
      }
      setFriendships(data || []);
      return data || [];
    },
    []
  );
  /* =========================================================
     Load Friends Profiles
  ========================================================= */
  const loadFriends = useCallback(
    async (currentUserId, friendshipRows) => {
      if (!currentUserId) return [];
      const accepted = (friendshipRows || []).filter(
        (item) => item.status === "accepted"
      );
      if (!accepted.length) {
        setFriends([]);
        return [];
      }
      const friendIds = accepted.map((friendship) =>
        friendship.requester_id === currentUserId
          ? friendship.addressee_id
          : friendship.requester_id
      );
      const uniqueIds = [...new Set(friendIds)];
      if (!uniqueIds.length) {
        setFriends([]);
        return [];
      }
      const { data: profiles, error } = await supabase
        .from("student_profiles")
        .select("id,user_id,student_code,full_name,avatar_url,section")
        .in("user_id", uniqueIds);
      if (error) {
        console.error("friends profiles error:", error);
        setFriends([]);
        return [];
      }
      /* -----------------------------------------------------
         Friend Activities
      ----------------------------------------------------- */
      const { data: friendActivities, error: activityError } =
        await supabase
          .from("friend_activity")
          .select(
            "id,user_id,activity_type,title,description,points,created_at"
          )
          .in("user_id", uniqueIds)
          .order("created_at", {
            ascending: false,
          });
      if (activityError) {
        console.error("friend activity error:", activityError);
      }
      const activityRows = friendActivities || [];
      const mappedFriends = (profiles || []).map((profile) => {
        const profileActivities = activityRows.filter(
          (activity) => activity.user_id === profile.user_id
        );
        const points = profileActivities.reduce(
          (total, activity) => total + Number(activity.points || 0),
          0
        );
        const latestActivity = profileActivities[0];
        let active = false;
        if (latestActivity?.created_at) {
          const activityTime = new Date(
            latestActivity.created_at
          ).getTime();
          const now = Date.now();
          const minutesAgo = (now - activityTime) / (1000 * 60);
          active = minutesAgo <= 15;
        }
        /*
         * لا يوجد level داخل student_profiles.
         * نحسب مستوى تقريبي بناءً على النقاط.
         */
        const level = Math.max(
          1,
          Math.floor(points / 250) + 1
        );
        /*
         * لا يوجد sessions counter مباشر في friend_activity.
         * لذلك نستخدم عدد أنشطة التركيز فقط لو كان
         * activity_type = focus_session أو focus.
         */
        const sessions = profileActivities.filter(
          (activity) =>
            activity.activity_type === "focus_session" ||
            activity.activity_type === "focus"
        ).length;
        const friendship = accepted.find((item) => {
          const otherId =
            item.requester_id === currentUserId
              ? item.addressee_id
              : item.requester_id;
          return otherId === profile.user_id;
        });
        return {
          id: profile.user_id,
          friendshipId: friendship?.id,
          name: profile.full_name,
          code: profile.student_code,
          avatar: getAvatar(profile),
          section: profile.section,
          level,
          points,
          sessions,
          active,
          lastActivity: latestActivity?.created_at || null,
        };
      });
      setFriends(mappedFriends);
      return mappedFriends;
    },
    []
  );
  /* =========================================================
     Load Friend Requests
  ========================================================= */
  const loadRequests = useCallback(
    async (currentUserId, friendshipRows) => {
      if (!currentUserId) return [];
      const pendingRequests = (friendshipRows || []).filter(
        (item) =>
          item.status === "pending" &&
          item.addressee_id === currentUserId
      );
      if (!pendingRequests.length) {
        setRequests([]);
        return [];
      }
      const requesterIds = pendingRequests.map(
        (item) => item.requester_id
      );
      const { data: profiles, error } = await supabase
        .from("student_profiles")
        .select("id,user_id,student_code,full_name,avatar_url,section")
        .in("user_id", requesterIds);
      if (error) {
        console.error("requests profiles error:", error);
        setRequests([]);
        return [];
      }
      const mappedRequests = pendingRequests
        .map((request) => {
          const profile = (profiles || []).find(
            (item) => item.user_id === request.requester_id
          );
          if (!profile) return null;
          return {
            id: request.id,
            userId: profile.user_id,
            name: profile.full_name,
            code: profile.student_code,
            avatar: getAvatar(profile),
            info: "طلب صداقة جديد",
            level: 1,
            points: 0,
            sessions: 0,
            active: false,
          };
        })
        .filter(Boolean);
      setRequests(mappedRequests);
      return mappedRequests;
    },
    []
  );
  /* =========================================================
     Load Challenges
  ========================================================= */
  const loadChallenges = useCallback(
    async (currentUserId) => {
      if (!currentUserId) return [];
      const { data: challengeRows, error } = await supabase
        .from("friend_challenges")
        .select(
          `
          id,
          creator_id,
          title,
          description,
          challenge_type,
          target_value,
          reward_points,
          start_date,
          end_date,
          status,
          created_at,
          updated_at
        `
        )
        .order("created_at", {
          ascending: false,
        });
      if (error) {
        console.error("challenges error:", error);
        setChallenges([]);
        setChallengeMembers([]);
        return [];
      }
      const challengeIds = (challengeRows || []).map(
        (challenge) => challenge.id
      );
      let memberRows = [];
      if (challengeIds.length) {
        const { data, error: memberError } = await supabase
          .from("friend_challenge_members")
          .select(
            `
            id,
            challenge_id,
            user_id,
            current_value,
            is_completed,
            completed_at,
            joined_at,
            updated_at,
            invitation_status
          `
          )
          .in("challenge_id", challengeIds);
        if (memberError) {
          console.error(
            "challenge members error:",
            memberError
          );
        } else {
          memberRows = data || [];
        }
      }
      setChallenges(challengeRows || []);
      setChallengeMembers(memberRows);
      return challengeRows || [];
    },
    []
  );
  /* =========================================================
     Load Activities
  ========================================================= */
  const loadActivities = useCallback(
    async (currentUserId, friendshipRows) => {
      if (!currentUserId) return [];
      const accepted = (friendshipRows || []).filter(
        (item) => item.status === "accepted"
      );
      const friendIds = accepted.map((item) =>
        item.requester_id === currentUserId
          ? item.addressee_id
          : item.requester_id
      );
      const userIds = [
        currentUserId,
        ...friendIds,
      ];
      const uniqueIds = [...new Set(userIds)];
      if (!uniqueIds.length) {
        setActivities([]);
        return [];
      }
      const { data, error } = await supabase
        .from("friend_activity")
        .select(
          "id,user_id,activity_type,title,description,source_id,points,created_at"
        )
        .in("user_id", uniqueIds)
        .order("created_at", {
          ascending: false,
        })
        .limit(10);
      if (error) {
        console.error("activities error:", error);
        setActivities([]);
        return [];
      }
      const profilesIds = uniqueIds;
      const { data: profiles, error: profileError } =
        await supabase
          .from("student_profiles")
          .select(
            "user_id,full_name,avatar_url,student_code"
          )
          .in("user_id", profilesIds);
      if (profileError) {
        console.error(
          "activity profiles error:",
          profileError
        );
      }
      const mappedActivities = (data || []).map(
        (activity) => {
          const profile = (profiles || []).find(
            (item) => item.user_id === activity.user_id
          );
          return {
            ...activity,
            userName:
              profile?.full_name ||
              (activity.user_id === currentUserId
                ? currentProfile?.full_name
                : "طالب"),
            avatar: getAvatar(profile),
            isCurrentUser:
              activity.user_id === currentUserId,
          };
        }
      );
      setActivities(mappedActivities);
      return mappedActivities;
    },
    [currentProfile]
  );
  /* =========================================================
     Load Everything
  ========================================================= */
  const loadAllData = useCallback(
    async (showLoader = false) => {
      try {
        if (showLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        const currentUserId =
          userId || (await loadCurrentUser());
        if (!currentUserId) {
          return;
        }
        await loadCurrentProfile(currentUserId);
        const friendshipRows =
          await loadFriendships(currentUserId);
        await Promise.all([
          loadFriends(currentUserId, friendshipRows),
          loadRequests(currentUserId, friendshipRows),
          loadChallenges(currentUserId),
          loadActivities(currentUserId, friendshipRows),
        ]);
      } catch (error) {
        console.error("Friends page load error:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      userId,
      loadCurrentUser,
      loadCurrentProfile,
      loadFriendships,
      loadFriends,
      loadRequests,
      loadChallenges,
      loadActivities,
    ]
  );
  useEffect(() => {
    loadAllData(true);
  }, []);
  /* =========================================================
     Derived Challenges
  ========================================================= */
  const currentUserChallengeMembers = useMemo(() => {
    if (!userId) return [];
    return challengeMembers.filter(
      (member) => member.user_id === userId
    );
  }, [challengeMembers, userId]);
  const visibleChallenges = useMemo(() => {
    if (!userId) return [];
    return challenges
      .map((challenge) => {
        const typeData = getChallengeTypeData(
          challenge.challenge_type
        );
        const ownMember =
          challengeMembers.find(
            (member) =>
              member.challenge_id === challenge.id &&
              member.user_id === userId
          ) || null;
        const allMembers = challengeMembers.filter(
          (member) =>
            member.challenge_id === challenge.id
        );
        const acceptedMembers = allMembers.filter(
          (member) =>
            member.invitation_status === "accepted"
        );
        const pendingMembers = allMembers.filter(
          (member) =>
            member.invitation_status === "pending"
        );
        const isOwner =
          challenge.creator_id === userId;
        const invitationStatus =
          ownMember?.invitation_status || null;
        const joined =
          isOwner ||
          invitationStatus === "accepted";
        const pending =
          invitationStatus === "pending";
        const progressValue = Number(
          ownMember?.current_value || 0
        );
        const targetValue = Number(
          challenge.target_value || 0
        );
        const progress =
          targetValue > 0
            ? Math.min(
                100,
                Math.round(
                  (progressValue / targetValue) * 100
                )
              )
            : 0;
        return {
          ...challenge,
          icon: typeData.icon,
          theme: typeData.theme,
          typeLabel: typeData.label,
          unit: typeData.unit,
          duration: getChallengeDuration(
            challenge.start_date,
            challenge.end_date
          ),
          target: targetValue,
          reward: Number(
            challenge.reward_points || 0
          ),
          progress,
          currentValue: progressValue,
          participants:
            acceptedMembers.length,
          pendingParticipants:
            pendingMembers.length,
          maxParticipants:
            allMembers.length || 1,
          isOwner,
          joined,
          pending,
          invitationStatus,
          category: isOwner
            ? "من إنشائك"
            : pending
            ? "دعوة جديدة"
            : joined
            ? "تحدي مشترك"
            : "تحدي صديق",
        };
      })
      .filter(
        (challenge) =>
          challenge.isOwner ||
          challenge.joined ||
          challenge.pending
      );
  }, [
    challenges,
    challengeMembers,
    userId,
  ]);
  /* =========================================================
     Filter Friends
  ========================================================= */
  const filteredFriends = useMemo(() => {
    let result = [...friends];
    if (activeTab === "active") {
      result = result.filter(
        (friend) => friend.active
      );
    }
    if (activeTab === "close") {
      result = result.filter(
        (friend) => friend.points >= 600
      );
    }
    if (search.trim()) {
      const value = search.trim().toLowerCase();
      result = result.filter(
        (friend) =>
          friend.name
            ?.toLowerCase()
            .includes(value) ||
          friend.code
            ?.toLowerCase()
            .includes(value)
      );
    }
    return result;
  }, [
    friends,
    activeTab,
    search,
  ]);
  /* =========================================================
     Stats
  ========================================================= */
  const totalPoints = useMemo(() => {
    return friends.reduce(
      (total, friend) =>
        total + Number(friend.points || 0),
      0
    );
  }, [friends]);
  const activeFriendsCount = useMemo(() => {
    return friends.filter(
      (friend) => friend.active
    ).length;
  }, [friends]);
  const joinedChallengesCount = useMemo(() => {
    return visibleChallenges.filter(
      (challenge) =>
        challenge.joined
    ).length;
  }, [visibleChallenges]);
  /* =========================================================
     Friend Requests
  ========================================================= */
  const handleAcceptRequest = async (
    request
  ) => {
    const { error } = await supabase
      .from("friendships")
      .update({
        status: "accepted",
        responded_at:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", request.id);
    if (error) {
      console.error(
        "accept request error:",
        error
      );
      Swal.fire({
        icon: "error",
        title: "حدث خطأ",
        text: "تعذر قبول طلب الصداقة",
      });
      return;
    }
    Swal.fire({
      icon: "success",
      title: "تم قبول الطلب",
      text: `أصبحت الآن صديقًا لـ ${request.name}`,
      timer: 1800,
      showConfirmButton: false,
    });
    await loadAllData(false);
  };
  const handleRejectRequest = async (
    request
  ) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "رفض طلب الصداقة؟",
      text: `هل تريد رفض طلب ${request.name}؟`,
      showCancelButton: true,
      confirmButtonText: "نعم، رفض",
      cancelButtonText: "إلغاء",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", request.id);
    if (error) {
      console.error(
        "reject request error:",
        error
      );
      Swal.fire({
        icon: "error",
        title: "حدث خطأ",
        text: "تعذر رفض الطلب",
      });
      return;
    }
    await loadAllData(false);
  };
  /* =========================================================
     Remove Friend
  ========================================================= */
  const handleRemoveFriend = async (
    friend
  ) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "إزالة الصديق؟",
      text: `هل أنت متأكد من إزالة ${friend.name} من أصدقائك؟`,
      showCancelButton: true,
      confirmButtonText: "نعم، إزالة",
      cancelButtonText: "إلغاء",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    if (!friend.friendshipId) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "تعذر تحديد علاقة الصداقة",
      });
      return;
    }
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friend.friendshipId);
    if (error) {
      console.error(
        "remove friend error:",
        error
      );
      Swal.fire({
        icon: "error",
        title: "حدث خطأ",
        text: "تعذر إزالة الصديق",
      });
      return;
    }
    Swal.fire({
      icon: "success",
      title: "تمت الإزالة",
      text: "تمت إزالة الصديق بنجاح",
      timer: 1600,
      showConfirmButton: false,
    });
    await loadAllData(false);
  };
  /* =========================================================
     Search Student
  ========================================================= */
  const handleSearchStudent = async () => {
    const code = studentCode.trim();
    setSearchedStudent(null);
    setSearchMessage("");
    setRequestSent(false);
    if (!code) {
      setSearchMessage(
        "اكتب كود الطالب أولاً"
      );
      return;
    }
    if (!userId) {
      setSearchMessage(
        "لم يتم تسجيل الدخول"
      );
      return;
    }
    const { data: profile, error } =
      await supabase
        .from("student_profiles")
        .select(
          "user_id,student_code,full_name,avatar_url,section"
        )
        .eq("student_code", code)
        .maybeSingle();
    if (error) {
      console.error(
        "student search error:",
        error
      );
      setSearchMessage(
        "حدث خطأ أثناء البحث"
      );
      return;
    }
    if (!profile) {
      setSearchMessage(
        "لم يتم العثور على طالب بهذا الكود"
      );
      return;
    }
    if (profile.user_id === userId) {
      setSearchMessage(
        "لا يمكنك إضافة نفسك كصديق"
      );
      return;
    }
    const existingFriendship =
      friendships.find(
        (friendship) =>
          (friendship.requester_id === userId &&
            friendship.addressee_id ===
              profile.user_id) ||
          (friendship.requester_id ===
            profile.user_id &&
            friendship.addressee_id ===
              userId)
      );
    if (existingFriendship) {
      if (
        existingFriendship.status ===
        "accepted"
      ) {
        setSearchMessage(
          "هذا الطالب موجود بالفعل في قائمة أصدقائك"
        );
      } else if (
        existingFriendship.requester_id ===
        userId
      ) {
        setSearchMessage(
          "تم إرسال طلب صداقة لهذا الطالب بالفعل"
        );
        setRequestSent(true);
      } else {
        setSearchMessage(
          "لديك طلب صداقة من هذا الطالب"
        );
      }
    }
    setSearchedStudent({
      id: profile.user_id,
      userId: profile.user_id,
      name: profile.full_name,
      code: profile.student_code,
      avatar: getAvatar(profile),
      section: profile.section,
    });
  };
  /* =========================================================
     Add Friend
  ========================================================= */
  const handleAddFriend = async () => {
    if (!searchedStudent || !userId) return;
    const existingFriendship =
      friendships.find(
        (friendship) =>
          (friendship.requester_id === userId &&
            friendship.addressee_id ===
              searchedStudent.userId) ||
          (friendship.requester_id ===
            searchedStudent.userId &&
            friendship.addressee_id ===
              userId)
      );
    if (existingFriendship) {
      Swal.fire({
        icon: "info",
        title: "تنبيه",
        text:
          existingFriendship.status ===
          "accepted"
            ? "هذا الطالب صديق بالفعل"
            : "يوجد طلب صداقة بالفعل",
      });
      return;
    }
    const { error } = await supabase
      .from("friendships")
      .insert({
        requester_id: userId,
        addressee_id:
          searchedStudent.userId,
        status: "pending",
      });
    if (error) {
      console.error(
        "add friend error:",
        error
      );
      Swal.fire({
        icon: "error",
        title: "حدث خطأ",
        text:
          error.code === "23505"
            ? "يوجد طلب صداقة بالفعل"
            : "تعذر إرسال طلب الصداقة",
      });
      return;
    }
    setRequestSent(true);
    Swal.fire({
      icon: "success",
      title: "تم إرسال الطلب",
      text: `تم إرسال طلب صداقة إلى ${searchedStudent.name}`,
      timer: 1800,
      showConfirmButton: false,
    });
    await loadAllData(false);
  };
  /* =========================================================
     Challenge Form
  ========================================================= */
  const handleChallengeTypeChange = (
    type
  ) => {
    const typeData =
      getChallengeTypeData(type);
    setChallengeForm((prev) => ({
      ...prev,
      type,
      target: String(
        typeData.defaultTarget
      ),
    }));
  };
  const handleChallengeFormChange = (
    event
  ) => {
    const { name, value } =
      event.target;
    setChallengeForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  /* =========================================================
     Toggle Invite Friend
  ========================================================= */
  const toggleInviteFriend = (
    friendId
  ) => {
    setSelectedInviteFriends(
      (prev) =>
        prev.includes(friendId)
          ? prev.filter(
              (id) => id !== friendId
            )
          : [...prev, friendId]
    );
  };
  /* =========================================================
     Create Challenge
  ========================================================= */
  const handleCreateChallenge =
    async (event) => {
      event.preventDefault();
      if (!userId) return;
      const title =
        challengeForm.title.trim();
      const type =
        challengeForm.type;
      const duration =
        Number(challengeForm.duration);
      const target =
        Number(challengeForm.target);
      if (!title) {
        Swal.fire({
          icon: "warning",
          title: "عنوان التحدي مطلوب",
          text: "اكتب اسمًا للتحدي",
        });
        return;
      }
      if (
        !Number.isFinite(duration) ||
        duration < 1
      ) {
        Swal.fire({
          icon: "warning",
          title: "مدة غير صحيحة",
          text: "حدد مدة صحيحة للتحدي",
        });
        return;
      }
      if (
        !Number.isFinite(target) ||
        target <= 0
      ) {
        Swal.fire({
          icon: "warning",
          title: "الهدف غير صحيح",
          text: "حدد هدفًا أكبر من صفر",
        });
        return;
      }
      const typeData =
        getChallengeTypeData(type);
      const startDate = getToday();
      const endDate = addDays(
        startDate,
        duration - 1
      );
      /* -----------------------------------------------------
         Create Challenge
      ----------------------------------------------------- */
      const { data: challenge, error } =
        await supabase
          .from("friend_challenges")
          .insert({
            creator_id: userId,
            title,
            description: `تحدي ${typeData.label}`,
            challenge_type: type,
            target_value: target,
            reward_points:
              Number(typeData.reward) || 0,
            start_date: startDate,
            end_date: endDate,
            status: "active",
          })
          .select()
          .single();
      if (error) {
        console.error(
          "create challenge error:",
          error
        );
        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text: "تعذر إنشاء التحدي",
        });
        return;
      }
      /* -----------------------------------------------------
         Add Creator As Accepted Member
      ----------------------------------------------------- */
      const membersToInsert = [
        {
          challenge_id: challenge.id,
          user_id: userId,
          current_value: 0,
          is_completed: false,
          invitation_status:
            "accepted",
        },
      ];
      /* -----------------------------------------------------
         Add Invited Friends As Pending
      ----------------------------------------------------- */
      selectedInviteFriends.forEach(
        (friendId) => {
          membersToInsert.push({
            challenge_id: challenge.id,
            user_id: friendId,
            current_value: 0,
            is_completed: false,
            invitation_status:
              "pending",
          });
        }
      );
      const { error: membersError } =
        await supabase
          .from("friend_challenge_members")
          .insert(membersToInsert);
      if (membersError) {
        console.error(
          "challenge members insert error:",
          membersError
        );
        /*
         * لو حصل خطأ بعد إنشاء التحدي،
         * نحاول حذف التحدي حتى لا يفضل تحدي ناقص.
         */
        await supabase
          .from("friend_challenges")
          .delete()
          .eq("id", challenge.id);
        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text: "تعذر إضافة المشاركين للتحدي",
        });
        return;
      }
      setChallengeModal(false);
      setChallengeForm({
        title: "",
        type: "focus",
        duration: "7",
        target: "300",
      });
      setSelectedInviteFriends([]);
      Swal.fire({
        icon: "success",
        title: "تم إنشاء التحدي 🎉",
        text:
          selectedInviteFriends.length > 0
            ? "تم إنشاء التحدي وإرسال الدعوات"
            : "تم إنشاء التحدي بنجاح",
        timer: 2000,
        showConfirmButton: false,
      });
      await loadAllData(false);
    };
  /* =========================================================
     Accept Challenge Invitation
  ========================================================= */
  const handleAcceptChallenge =
    async (challenge) => {
      if (!userId) return;
      const member =
        challengeMembers.find(
          (item) =>
            item.challenge_id ===
              challenge.id &&
            item.user_id === userId
        );
      if (!member) {
        Swal.fire({
          icon: "error",
          title: "خطأ",
          text: "لم يتم العثور على الدعوة",
        });
        return;
      }
      const { error } = await supabase
        .from("friend_challenge_members")
        .update({
          invitation_status:
            "accepted",
          joined_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", member.id)
        .eq("user_id", userId);
      if (error) {
        console.error(
          "accept challenge error:",
          error
        );
        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text: "تعذر قبول دعوة التحدي",
        });
        return;
      }
      Swal.fire({
        icon: "success",
        title: "تم قبول التحدي 🎯",
        text: "أصبحت مشاركًا في التحدي",
        timer: 1800,
        showConfirmButton: false,
      });
      await loadAllData(false);
    };
  /* =========================================================
     Reject Challenge Invitation
  ========================================================= */
  const handleRejectChallenge =
    async (challenge) => {
      if (!userId) return;
      const result = await Swal.fire({
        icon: "warning",
        title: "رفض دعوة التحدي؟",
        text: challenge.title,
        showCancelButton: true,
        confirmButtonText: "نعم، رفض",
        cancelButtonText: "إلغاء",
        reverseButtons: true,
      });
      if (!result.isConfirmed) return;
      const member =
        challengeMembers.find(
          (item) =>
            item.challenge_id ===
              challenge.id &&
            item.user_id === userId
        );
      if (!member) return;
      const { error } = await supabase
        .from("friend_challenge_members")
        .update({
          invitation_status:
            "rejected",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", member.id)
        .eq("user_id", userId);
      if (error) {
        console.error(
          "reject challenge error:",
          error
        );
        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text: "تعذر رفض الدعوة",
        });
        return;
      }
      await loadAllData(false);
    };
  /* =========================================================
     Challenge Details
  ========================================================= */
  const handleOpenChallengeDetails =
    async (challenge) => {
      setSelectedChallenge(challenge);
    };
  /* =========================================================
     Duel
  ========================================================= */
  const handleDuelFormChange = (
    event
  ) => {
    const { name, value } =
      event.target;
    setDuelForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleStartDuel = async (
    event
  ) => {
    event.preventDefault();
    if (!userId) return;
    if (!duelForm.friendId) {
      Swal.fire({
        icon: "warning",
        title: "اختر صديقًا",
        text: "يجب اختيار صديق لبدء التحدي",
      });
      return;
    }
    const goal =
      Number(duelForm.goal);
    if (
      !Number.isFinite(goal) ||
      goal <= 0
    ) {
      Swal.fire({
        icon: "warning",
        title: "الهدف غير صحيح",
        text: "أدخل هدفًا صحيحًا",
      });
      return;
    }
    const selectedFriend =
      friends.find(
        (friend) =>
          friend.id ===
          duelForm.friendId
      );
    if (!selectedFriend) return;
    const startDate = getToday();
    /*
     * 1v1 = Challenge باستخدام نفس نظام التحديات.
     */
    const { data: challenge, error } =
      await supabase
        .from("friend_challenges")
        .insert({
          creator_id: userId,
          title: `تحدي 1 ضد 1 مع ${selectedFriend.name}`,
          description:
            "تحدي فردي بين صديقين",
          challenge_type: "focus",
          target_value: goal,
          reward_points: 100,
          start_date: startDate,
          end_date: startDate,
          status: "active",
        })
        .select()
        .single();
    if (error) {
      console.error(
        "duel create error:",
        error
      );
      Swal.fire({
        icon: "error",
        title: "حدث خطأ",
        text: "تعذر إنشاء التحدي",
      });
      return;
    }
    const { error: memberError } =
      await supabase
        .from("friend_challenge_members")
        .insert([
          {
            challenge_id: challenge.id,
            user_id: userId,
            current_value: 0,
            is_completed: false,
            invitation_status:
              "accepted",
          },
          {
            challenge_id: challenge.id,
            user_id:
              selectedFriend.id,
            current_value: 0,
            is_completed: false,
            invitation_status:
              "pending",
          },
        ]);
    if (memberError) {
      console.error(
        "duel members error:",
        memberError
      );
      await supabase
        .from("friend_challenges")
        .delete()
        .eq("id", challenge.id);
      Swal.fire({
        icon: "error",
        title: "حدث خطأ",
        text: "تعذر إرسال تحدي المواجهة",
      });
      return;
    }
    setDuelForm({
      friendId: "",
      goal: "30",
    });
    Swal.fire({
      icon: "success",
      title: "تم إرسال التحدي ⚡",
      text: `تم إرسال تحدي 1 ضد 1 إلى ${selectedFriend.name}`,
      timer: 2000,
      showConfirmButton: false,
    });
    await loadAllData(false);
  };
  /* =========================================================
     Loading
  ========================================================= */
  if (loading) {
    return (
      <>
        <div className="friends-page">
          <Header />
          <div className="page-loading">
            <div className="page-loading-spinner"><FiRefreshCw /></div>
            <h3>جاري تحميل الأصدقاء...</h3>
            <p>تواصل مع أصدقائك وشاركهم رحلتك الدراسية</p>
          </div>
        </div>
      </>
    );
  }
  /* =========================================================
     Render
  ========================================================= */
  return (
    <>
      <div className="friends-page">
        <Header />
        <div className="friends-container">
          {/* =================================================
              Stats
          ================================================= */}
          <div className="friends-stats-grid">
            <div className="friends-stat-card">
              <div className="friends-stat-icon purple"><FaUserFriends /></div>
              <div>
                <span>إجمالي الأصدقاء</span>
                <strong>{friends.length}</strong>
              </div>
            </div>
            <div className="friends-stat-card">
              <div className="friends-stat-icon gold"><FaStar /></div>
              <div>
                <span>نقاط الأصدقاء</span>
                <strong>{totalPoints.toLocaleString("ar-EG")}</strong>
              </div>
            </div>
            <div className="friends-stat-card">
              <div className="friends-stat-icon orange"><FaFire /></div>
              <div>
                <span>الأصدقاء النشطون</span>
                <strong>{activeFriendsCount}</strong>
              </div>
            </div>
            <div className="friends-stat-card">
              <div className="friends-stat-icon green"><FaTrophy /></div>
              <div>
                <span>التحديات المشتركة</span>
                <strong>{joinedChallengesCount}</strong>
              </div>
            </div>
          </div>
          {/* =================================================
              Tabs
          ================================================= */}
          <div className="friends-tabs">
            <button
              className={activeTab === "requests" ? "active" : ""}
              onClick={() => setActiveTab("requests")}
            >
              <FaUserPlus />
              طلبات الصداقة
              {requests.length > 0 && <span className="friends-tab-count">{requests.length}</span>}
            </button>
            <button
              className={activeTab === "close" ? "active" : ""}
              onClick={() => setActiveTab("close")}
            >
              <FaCrown />
              الأصدقاء المقربون
            </button>
            <button
              className={activeTab === "all" ? "active" : ""}
              onClick={() => setActiveTab("all")}
            >
              <FaUsers />
              كل الأصدقاء
            </button>
            <button
              className={activeTab === "active" ? "active" : ""}
              onClick={() => setActiveTab("active")}
            >
              <FaBolt />
              النشطون الآن
              <span className="friends-tab-dot" />
            </button>
          </div>
          {/* =================================================
              Friend Requests
          ================================================= */}
          {activeTab === "requests" && (
            <section className="friends-section">
              <div className="section-heading">
                <div>
                  <h2>طلبات الصداقة</h2>
                  <p>الطلبات الجديدة المرسلة إليك</p>
                </div>
                <span className="section-count">{requests.length}</span>
              </div>
              {requests.length === 0 ? (
                <div className="friends-empty-state">
                  <FaUserCheck />
                  <h3>لا توجد طلبات</h3>
                  <p>عندما يرسل لك شخص طلب صداقة سيظهر هنا</p>
                </div>
              ) : (
                <div className="requests-list">
                  {requests.map((request) => (
                    <div className="request-card" key={request.id}>
                      <img src={request.avatar} alt={request.name} className="request-avatar" />
                      <div className="request-info">
                        <h3>{request.name}</h3>
                        <span>{request.code}</span>
                        <p>{request.info}</p>
                      </div>
                      <div className="request-actions">
                        <button className="accept-request" onClick={() => handleAcceptRequest(request)}><FaCheck /> قبول</button>
                        <button className="reject-request" onClick={() => handleRejectRequest(request)}><FaTimes /> رفض</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          {/* =================================================
              Friends List
          ================================================= */}
          {activeTab !== "requests" && (
            <section className="friends-section">
              <div className="section-heading">
                <div>
                  <h2>
                    {activeTab === "active"
                      ? "النشطون الآن"
                      : activeTab === "close"
                      ? "الأصدقاء المقربون"
                      : "كل الأصدقاء"}
                  </h2>
                  <p>{activeTab === "active" ? "الأصدقاء المتواجدون حاليًا" : "تواصل وتنافس مع أصدقائك"}</p>
                </div>
                <span className="section-count">{filteredFriends.length}</span>
              </div>
              <div className="friends-toolbar">
                <div className="friends-search">
                  <FaSearch />
                  <input
                    type="text"
                    placeholder="ابحث باسم الصديق أو الكود..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <button className="friends-sort-btn">الأكثر نشاطًا <FaChevronDown /></button>
              </div>
              {filteredFriends.length === 0 ? (
                <div className="friends-empty-state">
                  <FaUsers />
                  <h3>لا يوجد أصدقاء</h3>
                  <p>لم نجد أصدقاء مطابقين للبحث الحالي</p>
                </div>
              ) : (
                <div className="friends-list">
                  {filteredFriends.map((friend) => (
                    <div className="friend-card" key={friend.id}>
                      <div className="friend-main">
                        <div className="friend-avatar-wrapper">
                          <img src={friend.avatar} alt={friend.name} className="friend-avatar" />
                          {friend.active && <span className="friend-online-dot" />}
                        </div>
                        <div className="friend-info">
                          <h3>{friend.name}</h3>
                          <span className="friend-code">{friend.code}</span>
                          <div className="friend-meta">
                            <span>المستوى {friend.level}</span>
                            <span><FaStar /> {friend.points} نقطة</span>
                            <span><FaFire /> {friend.sessions} جلسة</span>
                          </div>
                        </div>
                      </div>
                      <div className="friend-actions">
                        <span className={friend.active ? "friend-status active" : "friend-status"}>{friend.active ? "نشط الآن" : "غير متصل"}</span>
                        <button className="friend-remove-btn" onClick={() => handleRemoveFriend(friend)}><FaUserMinus /> إزالة</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          {/* =================================================
              Challenges Hero
          ================================================= */}
          <section className="challenges-hero">
            <div className="challenges-hero-content">
              <div className="challenges-hero-icon"><FaTrophy /></div>
              <div>
                <h2>تحديات الأصدقاء</h2>
                <p>تنافس مع أصدقائك، حافظ على حماسك، وارفع مستواك</p>
              </div>
            </div>
            <button className="create-challenge-btn" onClick={() => setChallengeModal(true)}><FaPlus /> إنشاء تحدي</button>
          </section>
          {/* =================================================
              Challenges
          ================================================= */}
          <section className="friends-section challenges-section">
            <div className="section-heading">
              <div>
                <h2>التحديات</h2>
                <p>تحدياتك الحالية ودعوات أصدقائك</p>
              </div>
              <span className="section-count">{visibleChallenges.length}</span>
            </div>
            {visibleChallenges.length === 0 ? (
              <div className="friends-empty-state">
                <FaTrophy />
                <h3>لا توجد تحديات بعد</h3>
                <p>أنشئ أول تحدي وادعُ أصدقاءك</p>
                <button className="create-challenge-btn" onClick={() => setChallengeModal(true)}><FaPlus /> إنشاء تحدي</button>
              </div>
            ) : (
              <div className="challenges-grid">
                {visibleChallenges.map((challenge) => {
                  const Icon = challenge.icon;
                  return (
                    <div className={`challenge-card ${challenge.theme}`} key={challenge.id}>
                      <div className="challenge-card-top">
                        <div className="challenge-icon"><Icon /></div>
                        <span className="challenge-category">{challenge.category}</span>
                      </div>
                      <div className="challenge-content">
                        <h3>{challenge.title}</h3>
                        <p>{challenge.description}</p>
                        <div className="challenge-details">
                          <span><FaCalendarAlt /> {challenge.duration} يوم</span>
                          <span><FaBullseye /> {challenge.target} {challenge.unit}</span>
                          <span><FaGift /> {challenge.reward} نقطة</span>
                        </div>
                        <div className="challenge-progress">
                          <div className="challenge-progress-header">
                            <span>التقدم</span>
                            <strong>{challenge.progress}%</strong>
                          </div>
                          <div className="challenge-progress-bar">
                            <span style={{ width: `${challenge.progress}%` }} />
                          </div>
                          <div className="challenge-progress-values">
                            <span>{challenge.currentValue} {challenge.unit}</span>
                            <span>الهدف {challenge.target}</span>
                          </div>
                        </div>
                        <div className="challenge-footer">
                          <div className="challenge-participants">
                            <FaUsers />
                            <span>
                              {challenge.participants}
                              {challenge.pendingParticipants > 0 && (
                                <> + {challenge.pendingParticipants}</>
                              )}{" "}
                              مشارك
                            </span>
                          </div>
                          <button className="challenge-details-btn" onClick={() => handleOpenChallengeDetails(challenge)}>التفاصيل <FaChevronRight /></button>
                        </div>
                        {/* Invitation */}
                        {challenge.pending && (
                          <div className="challenge-invitation">
                            <div className="challenge-invitation-text">
                              <FaGift />
                              <span>تمت دعوتك لهذا التحدي</span>
                            </div>
                            <div className="challenge-invitation-actions">
                              <button className="challenge-invite-btn" onClick={() => handleAcceptChallenge(challenge)}><FaCheck /> قبول</button>
                              <button className="challenge-reject-btn" onClick={() => handleRejectChallenge(challenge)}><FaTimes /> رفض</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          {/* =================================================
              Add Friend
          ================================================= */}
          <section className="add-friend-section" id="add-friend-section">
            <div className="add-friend-header">
              <div className="add-friend-icon"><FaUserPlus /></div>
              <div>
                <h2>أضف صديقًا جديدًا</h2>
                <p>ابحث باستخدام كود الطالب الخاص به</p>
              </div>
            </div>
            <div className="add-friend-form">
              <div className="student-code-input">
                <FaSearch />
                <input
                  type="text"
                  placeholder="مثال: STU1001"
                  value={studentCode}
                  onChange={(event) => setStudentCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearchStudent();
                    }
                  }}
                />
              </div>
              <button className="student-search-btn" onClick={handleSearchStudent}>بحث</button>
            </div>
            {searchMessage && <div className="student-search-message">{searchMessage}</div>}
            {searchedStudent && (
              <div className="searched-student-card">
                <img src={searchedStudent.avatar} alt={searchedStudent.name} />
                <div>
                  <h3>{searchedStudent.name}</h3>
                  <span>{searchedStudent.code}</span>
                  {searchedStudent.section && <p>{searchedStudent.section}</p>}
                </div>
                <button className="add-searched-student-btn" onClick={handleAddFriend} disabled={requestSent}>
                  {requestSent ? (
                    <>
                      <FaCheck /> تم الإرسال
                    </>
                  ) : (
                    <>
                      <FaUserPlus /> إضافة صديق
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
          {/* =================================================
              Ranking
          ================================================= */}
          <section className="friends-section ranking-section">
            <div className="section-heading">
              <div>
                <h2>ترتيب الأصدقاء</h2>
                <p>أكثر أصدقائك تحقيقًا للنقاط</p>
              </div>
              <FaChartLine />
            </div>
            <div className="ranking-list">
              {[...friends]
                .sort((a, b) => b.points - a.points)
                .slice(0, 3)
                .map((friend, index) => (
                  <div className="ranking-item" key={friend.id}>
                    <div className="ranking-position">{index === 0 ? <FaCrown /> : index + 1}</div>
                    <img src={friend.avatar} alt={friend.name} className="ranking-avatar" />
                    <div className="ranking-info">
                      <h3>{friend.name}</h3>
                      <span>المستوى {friend.level}</span>
                    </div>
                    <strong className="ranking-points"><FaStar /> {friend.points}</strong>
                  </div>
                ))}
              {friends.length === 0 && (
                <div className="friends-empty-state">
                  <FaMedal />
                  <p>لا يوجد ترتيب بعد</p>
                </div>
              )}
            </div>
          </section>
          {/* =================================================
              Activity
          ================================================= */}
          <section className="friends-section activity-section">
            <div className="section-heading">
              <div>
                <h2>النشاط الأخير</h2>
                <p>آخر ما يحدث بينك وبين أصدقائك</p>
              </div>
              <FaClock />
            </div>
            {activities.length === 0 ? (
              <div className="friends-empty-state">
                <FaClock />
                <h3>لا يوجد نشاط حديث</h3>
                <p>سيظهر نشاطك ونشاط أصدقائك هنا</p>
              </div>
            ) : (
              <div className="activity-list">
                {activities.slice(0, 5).map((activity) => (
                  <div className="activity-item" key={activity.id}>
                    <img src={activity.avatar} alt={activity.userName} className="activity-avatar" />
                    <div className="activity-content">
                      <h3>{activity.title}</h3>
                      <p>{activity.description}</p>
                      <span>{activity.userName}</span>
                    </div>
                    {activity.points && Number(activity.points) > 0 && (
                      <strong className="activity-points">+{activity.points}</strong>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
          {/* =================================================
              Footer CTA
          ================================================= */}
          <section className="friends-footer-cta">
            <div>
              <FaUsers />
              <div>
                <h2>اجعل رحلتك الدراسية ممتعة مع أصدقائك</h2>
                <p>أضف أصدقاءك وابدأ التحديات وحقق أهدافك معًا</p>
              </div>
            </div>
            <button onClick={() => setChallengeModal(true)}><FaTrophy /> ابدأ تحديًا</button>
          </section>
        </div>
      </div>
      {/* =====================================================
          Create Challenge Modal
      ===================================================== */}
      {challengeModal && (
        <div
          className="friends-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setChallengeModal(false);
            }
          }}
        >
          <div className="friends-modal">
            <div className="friends-modal-header">
              <div>
                <h2>إنشاء تحدي جديد</h2>
                <p>أنشئ تحديًا وادعُ أصدقاءك</p>
              </div>
              <button onClick={() => setChallengeModal(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleCreateChallenge}>
              <div className="form-group">
                <label>اسم التحدي</label>
                <input
                  type="text"
                  name="title"
                  placeholder="مثال: سباق التركيز"
                  value={challengeForm.title}
                  onChange={handleChallengeFormChange}
                />
              </div>
              <div className="form-group">
                <label>نوع التحدي</label>
                <div className="challenge-type-options">
                  {["focus", "lessons", "points", "streak"].map((type) => {
                    const data = getChallengeTypeData(type);
                    const Icon = data.icon;
                    return (
                      <button
                        type="button"
                        key={type}
                        className={challengeForm.type === type ? "selected" : ""}
                        onClick={() => handleChallengeTypeChange(type)}
                      >
                        <Icon />
                        <span>{data.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>المدة بالأيام</label>
                  <input
                    type="number"
                    min="1"
                    name="duration"
                    value={challengeForm.duration}
                    onChange={handleChallengeFormChange}
                  />
                </div>
                <div className="form-group">
                  <label>الهدف</label>
                  <input
                    type="number"
                    min="1"
                    name="target"
                    value={challengeForm.target}
                    onChange={handleChallengeFormChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>دعوة الأصدقاء</label>
                {friends.length === 0 ? (
                  <div className="no-friends-invite">لا يوجد أصدقاء لإضافتهم</div>
                ) : (
                  <div className="invite-friends-list">
                    {friends.map((friend) => (
                      <button
                        type="button"
                        className={selectedInviteFriends.includes(friend.id) ? "invite-friend selected" : "invite-friend"}
                        key={friend.id}
                        onClick={() => toggleInviteFriend(friend.id)}
                      >
                        <img src={friend.avatar} alt={friend.name} />
                        <div>
                          <strong>{friend.name}</strong>
                          <span>{friend.code}</span>
                        </div>
                        {selectedInviteFriends.includes(friend.id) && <FaCheck />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="friends-modal-actions">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setChallengeModal(false)}
                >
                  إلغاء
                </button>
                <button type="submit" className="modal-submit-btn"><FaPlus /> إنشاء التحدي</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =====================================================
          Challenge Details Modal
      ===================================================== */}
      {selectedChallenge && (
        <div
          className="friends-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedChallenge(null);
            }
          }}
        >
          <div className="friends-modal challenge-details-modal">
            <div className="friends-modal-header">
              <div>
                <h2>{selectedChallenge.title}</h2>
                <p>تفاصيل التحدي</p>
              </div>
              <button onClick={() => setSelectedChallenge(null)}><FaTimes /></button>
            </div>
            <div className="challenge-modal-summary">
              <div>
                <span>الهدف</span>
                <strong>{selectedChallenge.target} {selectedChallenge.unit}</strong>
              </div>
              <div>
                <span>المكافأة</span>
                <strong>{selectedChallenge.reward} نقطة</strong>
              </div>
              <div>
                <span>التقدم</span>
                <strong>{selectedChallenge.progress}%</strong>
              </div>
            </div>
            <div className="challenge-details-progress">
              <div className="challenge-progress-header">
                <span>تقدمك</span>
                <strong>{selectedChallenge.currentValue} / {selectedChallenge.target}</strong>
              </div>
              <div className="challenge-progress-bar">
                <span style={{ width: `${selectedChallenge.progress}%` }} />
              </div>
            </div>
            <div className="challenge-leaderboard">
              <h3><FaTrophy /> المشاركون</h3>
              {challengeMembers
                .filter((member) => member.challenge_id === selectedChallenge.id)
                .map((member, index) => {
                  const friend = friends.find(
                    (item) =>
                      item.id ===
                      member.user_id
                  );
                  const isCurrentUser =
                    member.user_id ===
                    userId;
                  const value =
                    Number(
                      member.current_value ||
                        0
                    );
                  const percentage =
                    Number(
                      selectedChallenge.target ||
                        0
                    ) > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (value /
                              Number(
                                selectedChallenge.target
                              )) *
                              100
                          )
                        )
                      : 0;
                  return (
                    <div
                      className="challenge-leaderboard-item"
                      key={member.id}
                    >
                      <span className="leaderboard-rank">{index + 1}</span>
                      <img
                        src={
                          friend?.avatar ||
                          getAvatar(
                            isCurrentUser
                              ? currentProfile
                              : null
                          )
                        }
                        alt={
                          friend?.name ||
                          (isCurrentUser
                            ? currentProfile?.full_name
                            : "طالب")
                        }
                      />
                      <div>
                        <strong>{isCurrentUser ? "أنت" : friend?.name || "طالب"}</strong>
                        <span>
                          {member.invitation_status === "pending"
                            ? "في انتظار القبول"
                            : `${value} ${selectedChallenge.unit}`}
                        </span>
                      </div>
                      <strong>{percentage}%</strong>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
      {/* =====================================================
          Duel Modal
      ===================================================== */}
      <div className="friends-duel-trigger">
        <button
          onClick={() => {
            if (friends.length === 0) {
              Swal.fire({
                icon: "info",
                title: "أضف صديقًا أولاً",
                text: "يجب أن يكون لديك صديق لبدء تحدي 1 ضد 1",
              });
              return;
            }
            setDuelForm((prev) => ({
              ...prev,
              friendId:
                prev.friendId ||
                friends[0]?.id ||
                "",
            }));
            document.body.classList.add(
              "duel-modal-open"
            );
            const modal =
              document.getElementById(
                "duel-modal"
              );
            if (modal) {
              modal.style.display =
                "flex";
            }
          }}
        >
          <FaBolt /> تحدي 1 ضد 1
        </button>
      </div>
      <div
        className="friends-modal-overlay"
        id="duel-modal"
        style={{
          display: "none",
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            event.currentTarget.style.display =
              "none";
            document.body.classList.remove(
              "duel-modal-open"
            );
          }
        }}
      >
        <div className="friends-modal duel-modal">
          <div className="friends-modal-header">
            <div>
              <h2>تحدي 1 ضد 1 ⚡</h2>
              <p>تحدى أحد أصدقائك وشوف مين الأفضل</p>
            </div>
            <button
              onClick={(event) => {
                const modal =
                  event.currentTarget.closest(
                    "#duel-modal"
                  );
                if (modal) {
                  modal.style.display =
                    "none";
                }
                document.body.classList.remove(
                  "duel-modal-open"
                );
              }}
            >
              <FaTimes />
            </button>
          </div>
          <form onSubmit={handleStartDuel}>
            <div className="form-group">
              <label>اختر الصديق</label>
              <select
                name="friendId"
                value={duelForm.friendId}
                onChange={handleDuelFormChange}
              >
                <option value="">اختر صديقًا</option>
                {friends.map((friend) => (
                  <option value={friend.id} key={friend.id}>
                    {friend.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>الهدف بالدقائق</label>
              <input
                type="number"
                min="1"
                name="goal"
                value={duelForm.goal}
                onChange={handleDuelFormChange}
              />
            </div>
            <div className="friends-modal-actions">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={(event) => {
                  const modal =
                    event.currentTarget.closest(
                      "#duel-modal"
                    );
                  if (modal) {
                    modal.style.display =
                      "none";
                  }
                  document.body.classList.remove(
                    "duel-modal-open"
                  );
                }}
              >
                إلغاء
              </button>
              <button type="submit" className="modal-submit-btn"><FaBolt /> إرسال التحدي</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
export default Friends;