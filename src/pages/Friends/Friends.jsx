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
} from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import Header from "../../components/Header/Header";
import { supabase } from "../../utils/supabaseClient";
import "./Friends.css";

/* =========================================================
   Helpers
========================================================= */

const ITEMS_PER_PAGE = 5;

const getAvatar = (profile) => {
  if (profile?.avatar_url) return profile.avatar_url;

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
      unit: "ساعة",
      defaultTarget: 5,
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

const getChallengeDisplayValue = (value, type) => {
  const numeric = Number(value || 0);

  if (type === "focus") {
    return Number((numeric / 60).toFixed(1));
  }

  return numeric;
};

const getChallengeDbValue = (value, type) => {
  const numeric = Number(value || 0);

  if (type === "focus") {
    return Math.round(numeric * 60);
  }

  return numeric;
};

const getChallengeStart = (challenge) => {
  if (challenge?.started_at) {
    return new Date(challenge.started_at);
  }

  if (challenge?.start_date) {
    return new Date(`${challenge.start_date}T00:00:00`);
  }

  return null;
};

const getChallengeEnd = (challenge) => {
  if (challenge?.ends_at) {
    return new Date(challenge.ends_at);
  }

  if (challenge?.end_date) {
    return new Date(
      new Date(`${challenge.end_date}T00:00:00`).getTime() +
        24 * 60 * 60 * 1000
    );
  }

  return null;
};

const getChallengeDurationFromTimestamps = (challenge) => {
  const start = getChallengeStart(challenge);
  const end = getChallengeEnd(challenge);

  if (!start || !end) return 1;

  const diff = end.getTime() - start.getTime();

  return Math.max(
    1,
    Math.ceil(diff / (1000 * 60 * 60 * 24))
  );
};

const isChallengeFinished = (challenge) => {
  if (challenge?.status === "completed") {
    return true;
  }

  const end = getChallengeEnd(challenge);

  if (!end) return false;

  return Date.now() >= end.getTime();
};

/* =========================================================
   Pagination Helpers
========================================================= */

const getTotalPages = (items, perPage = ITEMS_PER_PAGE) => {
  return Math.max(1, Math.ceil(items.length / perPage));
};

const paginateItems = (
  items,
  page,
  perPage = ITEMS_PER_PAGE
) => {
  const start = (page - 1) * perPage;

  return items.slice(start, start + perPage);
};

const createPaginationData = (
  items,
  page,
  perPage = ITEMS_PER_PAGE
) => {
  const totalPages = getTotalPages(items, perPage);

  const safePage = Math.min(
    Math.max(page, 1),
    totalPages
  );

  return {
    items: paginateItems(items, safePage, perPage),
    page: safePage,
    totalPages,
    totalItems: items.length,
  };
};

const Friends = () => {
  /* =========================================================
     State
  ========================================================= */

  const [userId, setUserId] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [friendships, setFriendships] = useState([]);

  const [challenges, setChallenges] = useState([]);
  const [challengeMembers, setChallengeMembers] = useState([]);

  const [activities, setActivities] = useState([]);

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const [studentCode, setStudentCode] = useState("");
  const [searchedStudent, setSearchedStudent] = useState(null);
  const [searchMessage, setSearchMessage] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [challengeModal, setChallengeModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] =
    useState(null);

  const [challengeForm, setChallengeForm] = useState({
    title: "",
    type: "focus",
    duration: "7",
    target: "5",
  });

  const [selectedInviteFriends, setSelectedInviteFriends] =
    useState([]);

  const [duelForm, setDuelForm] = useState({
    friendId: "",
    goal: "1",
  });

  /* =========================================================
     Pagination State
  ========================================================= */

  const [friendsPage, setFriendsPage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);
  const [pendingChallengesPage, setPendingChallengesPage] =
    useState(1);
  const [activeChallengesPage, setActiveChallengesPage] =
    useState(1);
  const [wonChallengesPage, setWonChallengesPage] =
    useState(1);
  const [finishedChallengesPage, setFinishedChallengesPage] =
    useState(1);
  const [challengeMembersPage, setChallengeMembersPage] =
    useState(1);
  const [inviteFriendsPage, setInviteFriendsPage] =
    useState(1);

  /* =========================================================
     Current User
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

  const loadCurrentProfile = useCallback(
    async (currentUserId) => {
      if (!currentUserId) return null;

      const { data, error } = await supabase
        .from("student_profiles")
        .select(
          "id,user_id,student_code,full_name,avatar_url,section"
        )
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (error) {
        console.error("current profile error:", error);
        return null;
      }

      setCurrentProfile(data || null);

      return data || null;
    },
    []
  );

  /* =========================================================
     Friendships
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

  const loadFriends = useCallback(
    async (currentUserId, friendshipRows) => {
      if (!currentUserId) {
        setFriends([]);
        return [];
      }

      // ==========================================
      // 1. الأصدقاء المقبولين فقط
      // ==========================================
      const accepted = (friendshipRows || []).filter(
        (item) => item.status === "accepted"
      );

      if (!accepted.length) {
        setFriends([]);
        return [];
      }

      // ==========================================
      // 2. استخراج IDs الأصدقاء
      // ==========================================
      const friendIds = accepted
        .map((friendship) => {
          return friendship.requester_id === currentUserId
            ? friendship.addressee_id
            : friendship.requester_id;
        })
        .filter(Boolean);

      const uniqueIds = [...new Set(friendIds)];

      if (!uniqueIds.length) {
        setFriends([]);
        return [];
      }

      // ==========================================
      // 3. تحميل بيانات Profiles
      // ==========================================
      const {
        data: profiles,
        error: profilesError,
      } = await supabase
        .from("student_profiles")
        .select(
          `
            id,
            user_id,
            student_code,
            full_name,
            avatar_url,
            section
          `
        )
        .in("user_id", uniqueIds);

      if (profilesError) {
        console.error(
          "FRIENDS PROFILES ERROR:",
          profilesError
        );

        setFriends([]);
        return [];
      }

      // ==========================================
      // 4. تحميل النقاط الحقيقية من user_points
      // ==========================================
      const {
        data: pointsRows,
        error: pointsError,
      } = await supabase
        .from("user_points")
        .select(
          `
            user_id,
            total_points,
            current_level,
            current_streak,
            longest_streak
          `
        )
        .in("user_id", uniqueIds);

      if (pointsError) {
        console.error(
          "FRIENDS POINTS ERROR:",
          pointsError
        );
      }

      // ==========================================
      // 5. تحويل النقاط إلى Map
      // ==========================================
      const pointsMap = new Map();

      (pointsRows || []).forEach((row) => {
        pointsMap.set(row.user_id, {
          totalPoints: Number(row.total_points ?? 0),
          currentLevel: Number(row.current_level ?? 1),
          currentStreak: Number(row.current_streak ?? 0),
          longestStreak: Number(row.longest_streak ?? 0),
        });
      });


      // ==========================================
      // 6. تحميل النشاط فقط
      // ==========================================
      const {
        data: friendActivities,
        error: activityError,
      } = await supabase
        .from("friend_activity")
        .select(
          `
            id,
            user_id,
            activity_type,
            title,
            description,
            points,
            created_at
          `
        )
        .in("user_id", uniqueIds)
        .order("created_at", {
          ascending: false,
        });

      if (activityError) {
        console.error(
          "FRIEND ACTIVITY ERROR:",
          activityError
        );
      }

      const activityRows = friendActivities || [];

      // ==========================================
      // 7. بناء بيانات الأصدقاء
      // ==========================================
      const mappedFriends = (profiles || []).map(
        (profile) => {
          const profileActivities =
            activityRows.filter(
              (activity) =>
                activity.user_id === profile.user_id
            );

          const latestActivity =
            profileActivities[0] || null;

          // النقاط الحقيقية
          const pointsData =
            pointsMap.get(profile.user_id);



          const points =
            pointsData?.totalPoints ?? 0;

          const level =
            pointsData?.currentLevel ?? 1;

          const currentStreak =
            pointsData?.currentStreak ?? 0;

          const longestStreak =
            pointsData?.longestStreak ?? 0;

          // ==========================================
          // النشاط
          // ==========================================
          let active = false;

          if (latestActivity?.created_at) {
            const activityTime = new Date(
              latestActivity.created_at
            ).getTime();

            const minutesAgo =
              (Date.now() - activityTime) /
              (1000 * 60);

            active = minutesAgo <= 15;
          }

          // ==========================================
          // عدد جلسات التركيز
          // ==========================================
          const sessions =
            profileActivities.filter(
              (activity) =>
                activity.activity_type ===
                  "focus_session" ||
                activity.activity_type ===
                  "focus"
            ).length;

          // ==========================================
          // Friendship
          // ==========================================
          const friendship =
            accepted.find((item) => {
              const otherId =
                item.requester_id === currentUserId
                  ? item.addressee_id
                  : item.requester_id;

              return (
                otherId === profile.user_id
              );
            });

          return {
            id: profile.user_id,

            friendshipId:
              friendship?.id || null,

            name:
              profile.full_name || "طالب",

            code:
              profile.student_code || "",

            avatar:
              getAvatar(profile),

            section:
              profile.section || "",

            // ==========================================
            // بيانات user_points الحقيقية
            // ==========================================
            points,
            level,
            currentStreak,
            longestStreak,

            // ==========================================
            // بيانات النشاط
            // ==========================================
            sessions,
            active,

            lastActivity:
              latestActivity?.created_at || null,
          };
        }
      );

      setFriends(mappedFriends);

      return mappedFriends;
    },
    []
  );

  const loadRequests = useCallback(
    async (currentUserId, friendshipRows) => {
      if (!currentUserId) return [];

      const pendingRequests = (
        friendshipRows || []
      ).filter(
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

      const {
        data: profiles,
        error,
      } = await supabase
        .from("student_profiles")
        .select(
          "id,user_id,student_code,full_name,avatar_url,section"
        )
        .in("user_id", requesterIds);

      if (error) {
        console.error(
          "requests profiles error:",
          error
        );
        setRequests([]);
        return [];
      }

      const mappedRequests = pendingRequests
        .map((request) => {
          const profile = (profiles || []).find(
            (item) =>
              item.user_id === request.requester_id
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
     Challenges
  ========================================================= */

  const loadChallenges = useCallback(
    async (currentUserId) => {
      if (!currentUserId) return [];

      try {
        const {
          data: challengeRows,
          error: challengesError,
        } = await supabase
          .from("friend_challenges")
          .select(`
            id,
            creator_id,
            title,
            description,
            challenge_type,
            target_value,
            reward_points,
            start_date,
            end_date,
            started_at,
            ends_at,
            winner_user_id,
            status,
            created_at,
            updated_at
          `)
          .order("created_at", {
            ascending: false,
          });

        if (challengesError) {
          console.error(
            "FRIEND CHALLENGES ERROR:",
            challengesError
          );

          setChallenges([]);
          setChallengeMembers([]);

          return [];
        }

        const challengesData = challengeRows || [];

        if (!challengesData.length) {
          setChallenges([]);
          setChallengeMembers([]);
          return [];
        }

        const challengeIds =
          challengesData.map(
            (challenge) => challenge.id
          );

        const {
          data: memberRows,
          error: membersError,
        } = await supabase
          .from("friend_challenge_members")
          .select(`
            id,
            challenge_id,
            user_id,
            current_value,
            is_completed,
            completed_at,
            joined_at,
            updated_at,
            invitation_status
          `)
          .in("challenge_id", challengeIds);

        if (membersError) {
          console.error(
            "MEMBERS ERROR:",
            membersError
          );

          setChallenges(challengesData);
          setChallengeMembers([]);

          return challengesData;
        }

        const members = memberRows || [];

        const visibleChallenges =
          challengesData.filter(
            (challenge) => {
              const isCreator =
                challenge.creator_id === currentUserId;

              const isAccepted =
                members.some(
                  (member) =>
                    member.challenge_id ===
                      challenge.id &&
                    member.user_id ===
                      currentUserId &&
                    member.invitation_status ===
                      "accepted"
                );

              const isPending =
                members.some(
                  (member) =>
                    member.challenge_id ===
                      challenge.id &&
                    member.user_id ===
                      currentUserId &&
                    member.invitation_status ===
                      "pending"
                );

              return (
                isCreator ||
                isAccepted ||
                isPending
              );
            }
          );

        const progressResults =
          await Promise.all(
            visibleChallenges.map(
              async (challenge) => {
                const {
                  data,
                  error,
                } = await supabase.rpc(
                  "get_challenge_participants_progress",
                  {
                    p_challenge_id:
                      challenge.id,
                  }
                );

                if (error) {
                  console.error(
                    "RPC ERROR:",
                    challenge.id,
                    error
                  );

                  return {
                    challengeId:
                      challenge.id,
                    success: false,
                    data: [],
                  };
                }

                return {
                  challengeId:
                    challenge.id,
                  success: true,
                  data: data || [],
                };
              }
            )
          );

        const progressMap = new Map();

        progressResults.forEach(
          (result) => {
            if (!result.success) return;

            const map = new Map();

            (result.data || []).forEach(
              (row) => {
                map.set(
                  String(row.user_id),
                  {
                    current_value:
                      Number(
                        row.current_value || 0
                      ),
                    is_completed:
                      Boolean(
                        row.is_completed
                      ),
                  }
                );
              }
            );

            progressMap.set(
              result.challengeId,
              map
            );
          }
        );

        const now =
          new Date().toISOString();

        const calculatedMembers =
          members.map(
            (member) => {
              if (
                member.invitation_status !==
                "accepted"
              ) {
                return {
                  ...member,
                };
              }

              const challengeProgress =
                progressMap.get(
                  member.challenge_id
                );

              if (!challengeProgress) {
                return {
                  ...member,
                };
              }

              const rpcProgress =
                challengeProgress.get(
                  String(member.user_id)
                );

              if (!rpcProgress) {
                return {
                  ...member,
                };
              }

              let completedAt =
                member.completed_at;

              if (
                rpcProgress.is_completed &&
                !completedAt
              ) {
                completedAt = now;
              }

              return {
                ...member,
                current_value:
                  rpcProgress.current_value,
                is_completed:
                  rpcProgress.is_completed,
                completed_at:
                  completedAt,
              };
            }
          );

        for (
          const member of calculatedMembers
        ) {
          const original =
            members.find(
              (item) =>
                item.id === member.id
            );

          if (!original) continue;

          const valueChanged =
            Number(
              original.current_value || 0
            ) !==
            Number(
              member.current_value || 0
            );

          const completedChanged =
            Boolean(
              original.is_completed
            ) !==
            Boolean(
              member.is_completed
            );

          const completedAtChanged =
            String(
              original.completed_at || ""
            ) !==
            String(
              member.completed_at || ""
            );

          if (
            !valueChanged &&
            !completedChanged &&
            !completedAtChanged
          ) {
            continue;
          }

          const {
            error: updateError,
          } = await supabase
            .from(
              "friend_challenge_members"
            )
            .update({
              current_value:
                member.current_value,
              is_completed:
                member.is_completed,
              completed_at:
                member.completed_at || null,
              updated_at: now,
            })
            .eq("id", member.id);

          if (updateError) {
            console.error(
              "MEMBER UPDATE ERROR:",
              updateError
            );
          }
        }

        const calculatedChallenges =
          challengesData.map(
            (challenge) => {
              const challengeMembers =
                calculatedMembers.filter(
                  (member) =>
                    member.challenge_id ===
                    challenge.id
                );

              const acceptedMembers =
                challengeMembers.filter(
                  (member) =>
                    member.invitation_status ===
                    "accepted"
                );

              const finished =
                isChallengeFinished(
                  challenge
                );

              let winnerUserId =
                challenge.winner_user_id ||
                null;

              if (
                finished &&
                acceptedMembers.length
              ) {
                const values =
                  acceptedMembers.map(
                    (member) => ({
                      userId:
                        member.user_id,
                      value:
                        Number(
                          member.current_value ||
                            0
                        ),
                    })
                  );

                const highest =
                  Math.max(
                    ...values.map(
                      (item) =>
                        item.value
                    )
                  );

                if (highest > 0) {
                  const winners =
                    values.filter(
                      (item) =>
                        item.value ===
                        highest
                    );

                  winnerUserId =
                    winners.length === 1
                      ? winners[0].userId
                      : null;
                } else {
                  winnerUserId = null;
                }
              }

              return {
                ...challenge,
                status: finished
                  ? "completed"
                  : "active",
                winner_user_id:
                  winnerUserId,
              };
            }
          );

        for (
          const challenge of calculatedChallenges
        ) {
          const original =
            challengesData.find(
              (item) =>
                item.id === challenge.id
            );

          if (!original) continue;

          const statusChanged =
            original.status !==
            challenge.status;

          const winnerChanged =
            String(
              original.winner_user_id || ""
            ) !==
            String(
              challenge.winner_user_id || ""
            );

          if (
            !statusChanged &&
            !winnerChanged
          ) {
            continue;
          }

          const {
            error: updateError,
          } = await supabase
            .from("friend_challenges")
            .update({
              status:
                challenge.status,
              winner_user_id:
                challenge.winner_user_id ||
                null,
              updated_at: now,
            })
            .eq(
              "id",
              challenge.id
            );

          if (updateError) {
            console.error(
              "CHALLENGE UPDATE ERROR:",
              updateError
            );
          }
        }

        setChallenges(
          calculatedChallenges
        );

        setChallengeMembers(
          calculatedMembers
        );

        return calculatedChallenges;
      } catch (error) {
        console.error(
          "LOAD CHALLENGES ERROR:",
          error
        );

        return [];
      }
    },
    []
  );

  /* =========================================================
     Activities
  ========================================================= */

  const loadActivities = useCallback(
    async (
      currentUserId,
      friendshipRows
    ) => {
      if (!currentUserId) return [];

      const accepted = (
        friendshipRows || []
      ).filter(
        (item) =>
          item.status === "accepted"
      );

      const friendIds = accepted.map(
        (item) =>
          item.requester_id === currentUserId
            ? item.addressee_id
            : item.requester_id
      );

      const uniqueIds = [
        ...new Set([
          currentUserId,
          ...friendIds,
        ]),
      ];

      if (!uniqueIds.length) {
        setActivities([]);
        return [];
      }

      const {
        data,
        error,
      } = await supabase
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
        console.error(
          "activities error:",
          error
        );

        setActivities([]);

        return [];
      }

      const {
        data: profiles,
      } = await supabase
        .from("student_profiles")
        .select(
          "user_id,full_name,avatar_url,student_code"
        )
        .in("user_id", uniqueIds);

      const mappedActivities =
        (data || []).map(
          (activity) => {
            const profile =
              (profiles || []).find(
                (item) =>
                  item.user_id ===
                  activity.user_id
              );

            return {
              ...activity,
              userName:
                profile?.full_name ||
                (activity.user_id ===
                currentUserId
                  ? currentProfile?.full_name
                  : "طالب"),
              avatar:
                getAvatar(profile),
              isCurrentUser:
                activity.user_id ===
                currentUserId,
            };
          }
        );

      setActivities(mappedActivities);

      return mappedActivities;
    },
    [currentProfile]
  );

  /* =========================================================
     Load All
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
          userId ||
          (await loadCurrentUser());

        if (!currentUserId) return;

        await loadCurrentProfile(
          currentUserId
        );

        const friendshipRows =
          await loadFriendships(
            currentUserId
          );

        await Promise.all([
          loadFriends(
            currentUserId,
            friendshipRows
          ),
          loadRequests(
            currentUserId,
            friendshipRows
          ),
          loadChallenges(
            currentUserId
          ),
          loadActivities(
            currentUserId,
            friendshipRows
          ),
        ]);
      } catch (error) {
        console.error(
          "Friends page load error:",
          error
        );
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

  useEffect(() => {
    if (!userId) return;

    const interval =
      setInterval(() => {
        loadChallenges(userId);
      }, 60 * 1000);

    return () =>
      clearInterval(interval);
  }, [
    userId,
    loadChallenges,
  ]);

  /* =========================================================
     Derived Challenge Data
  ========================================================= */

  const visibleChallenges = useMemo(() => {
    if (!userId) return [];

    return challenges
      .map((challenge) => {
        const typeData =
          getChallengeTypeData(
            challenge.challenge_type
          );

        const allMembers =
          challengeMembers.filter(
            (member) =>
              member.challenge_id ===
              challenge.id
          );

        const acceptedMembers =
          allMembers.filter(
            (member) =>
              member.invitation_status ===
              "accepted"
          );

        const pendingMembers =
          allMembers.filter(
            (member) =>
              member.invitation_status ===
              "pending"
          );

        const ownMember =
          allMembers.find(
            (member) =>
              member.user_id === userId
          ) || null;

        const isOwner =
          challenge.creator_id ===
          userId;

        const invitationStatus =
          ownMember?.invitation_status ||
          null;

        const joined =
          isOwner ||
          invitationStatus === "accepted";

        const pending =
          invitationStatus === "pending";

        const finished =
          isChallengeFinished(
            challenge
          );

        const targetValue =
          getChallengeDisplayValue(
            challenge.target_value,
            challenge.challenge_type
          );

        const participantsProgress =
          acceptedMembers.map(
            (member) => {
              const currentValue =
                getChallengeDisplayValue(
                  member.current_value,
                  challenge.challenge_type
                );

              const progress =
                targetValue > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (currentValue /
                          targetValue) *
                          100
                      )
                    )
                  : 0;

              return {
                ...member,
                currentValue,
                progress,
                isCurrentUser:
                  member.user_id ===
                  userId,
                isCreator:
                  member.user_id ===
                  challenge.creator_id,
              };
            }
          );

        const ownProgressData =
          participantsProgress.find(
            (member) =>
              member.user_id ===
              userId
          ) || null;

        const progressValue =
          ownProgressData?.currentValue ||
          0;

        const progress =
          ownProgressData?.progress ||
          0;

        const winnerUserId =
          challenge.winner_user_id ||
          null;

        const isWinner =
          winnerUserId === userId;

        const hasWinner =
          Boolean(winnerUserId);

        let isTie = false;

        if (
          finished &&
          !hasWinner &&
          acceptedMembers.length > 0
        ) {
          const values =
            acceptedMembers.map(
              (member) =>
                Number(
                  member.current_value ||
                    0
                )
            );

          const highest =
            Math.max(...values);

          if (highest > 0) {
            const highestCount =
              values.filter(
                (value) =>
                  value === highest
              ).length;

            isTie =
              highestCount > 1;
          }
        }

        const winnerMember =
          participantsProgress.find(
            (member) =>
              member.user_id ===
              winnerUserId
          ) || null;

        return {
          ...challenge,
          icon: typeData.icon,
          theme: typeData.theme,
          typeLabel: typeData.label,
          unit: typeData.unit,
          duration:
            getChallengeDurationFromTimestamps(
              challenge
            ),
          target: targetValue,
          reward: Number(
            challenge.reward_points || 0
          ),
          progress,
          currentValue: progressValue,
          participantsProgress,
          winnerMember,
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
          finished,
          isWinner,
          hasWinner,
          isTie,
          category: isOwner
            ? "من إنشائك"
            : pending
            ? "دعوة جديدة"
            : finished
            ? "منتهي"
            : "تحدي مشترك",
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

  const pendingChallengeInvitations =
    useMemo(
      () =>
        visibleChallenges.filter(
          (challenge) =>
            challenge.pending
        ),
      [visibleChallenges]
    );

  const activeChallenges =
    useMemo(
      () =>
        visibleChallenges.filter(
          (challenge) =>
            challenge.joined &&
            !challenge.finished
        ),
      [visibleChallenges]
    );

  const finishedChallenges =
    useMemo(
      () =>
        visibleChallenges.filter(
          (challenge) =>
            challenge.joined &&
            challenge.finished
        ),
      [visibleChallenges]
    );

  const wonChallenges =
    useMemo(
      () =>
        finishedChallenges.filter(
          (challenge) =>
            challenge.isWinner
        ),
      [finishedChallenges]
    );

  const otherFinishedChallenges =
    useMemo(
      () =>
        finishedChallenges.filter(
          (challenge) =>
            !challenge.isWinner
        ),
      [finishedChallenges]
    );

  const wonChallengesCount =
    wonChallenges.length;

  /* =========================================================
     Friends Filtering
  ========================================================= */

  const filteredFriends =
    useMemo(() => {
      let result = [...friends];

      if (activeTab === "active") {
        result = result.filter(
          (friend) => friend.active
        );
      }

      if (activeTab === "close") {
        result = result.filter(
          (friend) =>
            friend.points >= 600
        );
      }

      if (search.trim()) {
        const value =
          search
            .trim()
            .toLowerCase();

        result =
          result.filter(
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
     Pagination Data
  ========================================================= */

  const paginatedFriends =
    useMemo(
      () =>
        createPaginationData(
          filteredFriends,
          friendsPage
        ),
      [
        filteredFriends,
        friendsPage,
      ]
    );

  const paginatedRequests =
    useMemo(
      () =>
        createPaginationData(
          requests,
          requestsPage
        ),
      [requests, requestsPage]
    );

  const paginatedPendingChallenges =
    useMemo(
      () =>
        createPaginationData(
          pendingChallengeInvitations,
          pendingChallengesPage
        ),
      [
        pendingChallengeInvitations,
        pendingChallengesPage,
      ]
    );

  const paginatedActiveChallenges =
    useMemo(
      () =>
        createPaginationData(
          activeChallenges,
          activeChallengesPage
        ),
      [
        activeChallenges,
        activeChallengesPage,
      ]
    );

  const paginatedWonChallenges =
    useMemo(
      () =>
        createPaginationData(
          wonChallenges,
          wonChallengesPage
        ),
      [
        wonChallenges,
        wonChallengesPage,
      ]
    );

  const paginatedFinishedChallenges =
    useMemo(
      () =>
        createPaginationData(
          otherFinishedChallenges,
          finishedChallengesPage
        ),
      [
        otherFinishedChallenges,
        finishedChallengesPage,
      ]
    );

  const challengeMembersForSelected =
    useMemo(() => {
      if (!selectedChallenge) {
        return [];
      }

      return challengeMembers
        .filter(
          (member) =>
            member.challenge_id ===
            selectedChallenge.id
        )
        .sort(
          (a, b) =>
            Number(
              b.current_value || 0
            ) -
            Number(
              a.current_value || 0
            )
        );
    }, [
      challengeMembers,
      selectedChallenge,
    ]);

  const paginatedChallengeMembers =
    useMemo(
      () =>
        createPaginationData(
          challengeMembersForSelected,
          challengeMembersPage
        ),
      [
        challengeMembersForSelected,
        challengeMembersPage,
      ]
    );

  const paginatedInviteFriends =
    useMemo(
      () =>
        createPaginationData(
          friends,
          inviteFriendsPage
        ),
      [friends, inviteFriendsPage]
    );

  /* =========================================================
     Pagination Reset
  ========================================================= */

  useEffect(() => {
    setFriendsPage(1);
  }, [activeTab, search]);

  useEffect(() => {
    const totalPages =
      getTotalPages(filteredFriends);

    if (
      friendsPage > totalPages
    ) {
      setFriendsPage(totalPages);
    }
  }, [
    filteredFriends,
    friendsPage,
  ]);

  useEffect(() => {
    const totalPages =
      getTotalPages(requests);

    if (
      requestsPage > totalPages
    ) {
      setRequestsPage(totalPages);
    }
  }, [
    requests,
    requestsPage,
  ]);

  useEffect(() => {
    const totalPages =
      getTotalPages(
        pendingChallengeInvitations
      );

    if (
      pendingChallengesPage >
      totalPages
    ) {
      setPendingChallengesPage(
        totalPages
      );
    }
  }, [
    pendingChallengeInvitations,
    pendingChallengesPage,
  ]);

  useEffect(() => {
    const totalPages =
      getTotalPages(
        activeChallenges
      );

    if (
      activeChallengesPage >
      totalPages
    ) {
      setActiveChallengesPage(
        totalPages
      );
    }
  }, [
    activeChallenges,
    activeChallengesPage,
  ]);

  useEffect(() => {
    const totalPages =
      getTotalPages(
        wonChallenges
      );

    if (
      wonChallengesPage >
      totalPages
    ) {
      setWonChallengesPage(
        totalPages
      );
    }
  }, [
    wonChallenges,
    wonChallengesPage,
  ]);

  useEffect(() => {
    const totalPages =
      getTotalPages(
        otherFinishedChallenges
      );

    if (
      finishedChallengesPage >
      totalPages
    ) {
      setFinishedChallengesPage(
        totalPages
      );
    }
  }, [
    otherFinishedChallenges,
    finishedChallengesPage,
  ]);

  useEffect(() => {
    setChallengeMembersPage(1);
  }, [selectedChallenge?.id]);

  /* =========================================================
     Stats
  ========================================================= */

  const totalPoints = useMemo(
    () =>
      friends.reduce(
        (total, friend) =>
          total +
          Number(
            friend.points || 0
          ),
        0
      ),
    [friends]
  );

  const activeFriendsCount =
    useMemo(
      () =>
        friends.filter(
          (friend) =>
            friend.active
        ).length,
      [friends]
    );

  /* =========================================================
     Actions
  ========================================================= */

  const handleAcceptRequest =
    async (request) => {
      const { error } =
        await supabase
          .from("friendships")
          .update({
            status: "accepted",
            responded_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            request.id
          );

      if (error) {
        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            "تعذر قبول طلب الصداقة",
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

  const handleRejectRequest =
    async (request) => {
      const result =
        await Swal.fire({
          icon: "warning",
          title:
            "رفض طلب الصداقة؟",
          text: `هل تريد رفض طلب ${request.name}؟`,
          showCancelButton: true,
          confirmButtonText:
            "نعم، رفض",
          cancelButtonText:
            "إلغاء",
          reverseButtons: true,
        });

      if (!result.isConfirmed)
        return;

      const { error } =
        await supabase
          .from("friendships")
          .delete()
          .eq(
            "id",
            request.id
          );

      if (error) {
        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            "تعذر رفض الطلب",
        });
        return;
      }

      await loadAllData(false);
    };

  const handleRemoveFriend =
    async (friend) => {
      const result =
        await Swal.fire({
          icon: "warning",
          title:
            "إزالة الصديق؟",
          text: `هل أنت متأكد من إزالة ${friend.name} من أصدقائك؟`,
          showCancelButton: true,
          confirmButtonText:
            "نعم، إزالة",
          cancelButtonText:
            "إلغاء",
          reverseButtons: true,
        });

      if (!result.isConfirmed)
        return;

      if (!friend.friendshipId) {
        Swal.fire({
          icon: "error",
          title: "خطأ",
          text:
            "تعذر تحديد علاقة الصداقة",
        });
        return;
      }

      const { error } =
        await supabase
          .from("friendships")
          .delete()
          .eq(
            "id",
            friend.friendshipId
          );

      if (error) {
        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            "تعذر إزالة الصديق",
        });
        return;
      }

      Swal.fire({
        icon: "success",
        title: "تمت الإزالة",
        text:
          "تمت إزالة الصديق بنجاح",
        timer: 1600,
        showConfirmButton: false,
      });

      await loadAllData(false);
    };

  const handleSearchStudent =
    async () => {
      const searchValue =
        studentCode.trim();

      setSearchedStudent(null);
      setSearchMessage("");
      setRequestSent(false);

      if (!searchValue) {
        setSearchMessage(
          "اكتب كود الطالب أو رقم الموبايل أولاً"
        );
        return;
      }

      if (!userId) {
        setSearchMessage(
          "لم يتم تسجيل الدخول"
        );
        return;
      }

      const {
        data: profiles,
        error,
      } = await supabase
        .from("student_profiles")
        .select(
          "user_id,student_code,full_name,avatar_url,section,phone"
        )
        .or(
          `student_code.eq.${searchValue},phone.eq.${searchValue}`
        )
        .limit(2);

      if (error) {
        setSearchMessage(
          "حدث خطأ أثناء البحث"
        );
        return;
      }

      if (
        !profiles ||
        profiles.length === 0
      ) {
        setSearchMessage(
          "لم يتم العثور على طالب بهذا الكود أو رقم الموبايل"
        );
        return;
      }

      if (profiles.length > 1) {
        setSearchMessage(
          "تم العثور على أكثر من طالب، استخدم كود الطالب للبحث بدقة"
        );
        return;
      }

      const profile =
        profiles[0];

      if (
        profile.user_id ===
        userId
      ) {
        setSearchMessage(
          "لا يمكنك إضافة نفسك كصديق"
        );
        return;
      }

      const existingFriendship =
        friendships.find(
          (friendship) =>
            (friendship.requester_id ===
              userId &&
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
        phone: profile.phone,
        avatar: getAvatar(profile),
        section: profile.section,
      });
    };

  const handleAddFriend =
    async () => {
      if (
        !searchedStudent ||
        !userId
      )
        return;

      const existingFriendship =
        friendships.find(
          (friendship) =>
            (friendship.requester_id ===
              userId &&
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

      const { error } =
        await supabase
          .from("friendships")
          .insert({
            requester_id: userId,
            addressee_id:
              searchedStudent.userId,
            status: "pending",
          });

      if (error) {
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
        title:
          "تم إرسال الطلب",
        text: `تم إرسال طلب صداقة إلى ${searchedStudent.name}`,
        timer: 1800,
        showConfirmButton: false,
      });

      await loadAllData(false);
    };

  /* =========================================================
     Challenge Actions
  ========================================================= */

  const handleChallengeTypeChange =
    (type) => {
      const typeData =
        getChallengeTypeData(type);

      setChallengeForm(
        (prev) => ({
          ...prev,
          type,
          target:
            String(
              typeData.defaultTarget
            ),
        })
      );
    };

  const handleChallengeFormChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setChallengeForm(
        (prev) => ({
          ...prev,
          [name]: value,
        })
      );
    };

  const toggleInviteFriend =
    (friendId) => {
      setSelectedInviteFriends(
        (prev) =>
          prev.includes(friendId)
            ? prev.filter(
                (id) =>
                  id !== friendId
              )
            : [
                ...prev,
                friendId,
              ]
      );
    };

  const openChallengeModal =
    () => {
      setInviteFriendsPage(1);
      setSelectedInviteFriends(
        []
      );
      setChallengeModal(true);
    };

  const handleCreateChallenge =
    async (event) => {
      event.preventDefault();

      if (!userId) return;

      const title =
        challengeForm.title.trim();

      const type =
        challengeForm.type;

      const duration = Number(
        challengeForm.duration
      );

      const target =
        getChallengeDbValue(
          challengeForm.target,
          type
        );

      if (!title) {
        Swal.fire({
          icon: "warning",
          title:
            "عنوان التحدي مطلوب",
          text:
            "اكتب اسمًا للتحدي",
        });
        return;
      }

      if (
        !Number.isFinite(
          duration
        ) ||
        duration < 1
      ) {
        Swal.fire({
          icon: "warning",
          title:
            "مدة غير صحيحة",
          text:
            "حدد مدة صحيحة للتحدي",
        });
        return;
      }

      if (
        !Number.isFinite(
          target
        ) ||
        target <= 0
      ) {
        Swal.fire({
          icon: "warning",
          title:
            "الهدف غير صحيح",
          text:
            "حدد هدفًا أكبر من صفر",
        });
        return;
      }

      const typeData =
        getChallengeTypeData(type);

      const startedAt =
        new Date();

      const endsAt =
        new Date(
          startedAt.getTime() +
            duration *
              24 *
              60 *
              60 *
              1000
        );

      const startDate =
        startedAt
          .toISOString()
          .split("T")[0];

      const endDate =
        endsAt
          .toISOString()
          .split("T")[0];

      const {
        data: challenge,
        error,
      } = await supabase
        .from(
          "friend_challenges"
        )
        .insert({
          creator_id: userId,
          title,
          description: `تحدي ${typeData.label}`,
          challenge_type: type,
          target_value: target,
          reward_points:
            Number(
              typeData.reward
            ) || 0,
          start_date: startDate,
          end_date: endDate,
          started_at:
            startedAt.toISOString(),
          ends_at:
            endsAt.toISOString(),
          status: "active",
          winner_user_id: null,
        })
        .select()
        .single();

      if (error) {
        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            "تعذر إنشاء التحدي",
        });
        return;
      }

      const membersToInsert = [
        {
          challenge_id:
            challenge.id,
          user_id: userId,
          current_value: 0,
          is_completed: false,
          invitation_status:
            "accepted",
        },
      ];

      selectedInviteFriends.forEach(
        (friendId) => {
          membersToInsert.push({
            challenge_id:
              challenge.id,
            user_id: friendId,
            current_value: 0,
            is_completed: false,
            invitation_status:
              "pending",
          });
        }
      );

      const {
        error: membersError,
      } = await supabase
        .from(
          "friend_challenge_members"
        )
        .insert(
          membersToInsert
        );

      if (membersError) {
        await supabase
          .from(
            "friend_challenges"
          )
          .delete()
          .eq(
            "id",
            challenge.id
          );

        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            "تعذر إضافة المشاركين للتحدي",
        });

        return;
      }

      setChallengeModal(false);

      setChallengeForm({
        title: "",
        type: "focus",
        duration: "7",
        target: "5",
      });

      setSelectedInviteFriends(
        []
      );

      Swal.fire({
        icon: "success",
        title:
          "تم إنشاء التحدي 🎉",
        text:
          selectedInviteFriends.length >
          0
            ? "تم إنشاء التحدي وإرسال الدعوات"
            : "تم إنشاء التحدي بنجاح",
        timer: 2000,
        showConfirmButton: false,
      });

      await loadAllData(false);
    };

  const handleAcceptChallenge =
    async (challenge) => {
      if (!userId) return;

      const member =
        challengeMembers.find(
          (item) =>
            item.challenge_id ===
              challenge.id &&
            item.user_id ===
              userId
        );

      if (!member) {
        Swal.fire({
          icon: "error",
          title: "خطأ",
          text:
            "لم يتم العثور على الدعوة",
        });
        return;
      }

      const { error } =
        await supabase
          .from(
            "friend_challenge_members"
          )
          .update({
            invitation_status:
              "accepted",
            joined_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            member.id
          )
          .eq(
            "user_id",
            userId
          );

      if (error) {
        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            "تعذر قبول دعوة التحدي",
        });
        return;
      }

      Swal.fire({
        icon: "success",
        title:
          "تم قبول التحدي 🎯",
        text:
          "أصبحت مشاركًا في التحدي",
        timer: 1800,
        showConfirmButton: false,
      });

      await loadAllData(false);
    };

  const handleRejectChallenge =
    async (challenge) => {
      if (!userId) return;

      const result =
        await Swal.fire({
          icon: "warning",
          title:
            "رفض دعوة التحدي؟",
          text: challenge.title,
          showCancelButton: true,
          confirmButtonText:
            "نعم، رفض",
          cancelButtonText:
            "إلغاء",
          reverseButtons: true,
        });

      if (!result.isConfirmed)
        return;

      const member =
        challengeMembers.find(
          (item) =>
            item.challenge_id ===
              challenge.id &&
            item.user_id ===
              userId
        );

      if (!member) return;

      const { error } =
        await supabase
          .from(
            "friend_challenge_members"
          )
          .update({
            invitation_status:
              "rejected",
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            member.id
          )
          .eq(
            "user_id",
            userId
          );

      if (error) {
        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            "تعذر رفض الدعوة",
        });
        return;
      }

      await loadAllData(false);
    };

  const handleOpenChallengeDetails =
    (challenge) => {
      setChallengeMembersPage(1);
      setSelectedChallenge(
        challenge
      );
    };

  /* =========================================================
     Duel
  ========================================================= */

  const handleDuelFormChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setDuelForm(
        (prev) => ({
          ...prev,
          [name]: value,
        })
      );
    };

  const handleStartDuel =
    async (event) => {
      event.preventDefault();

      if (!userId) return;

      if (!duelForm.friendId) {
        Swal.fire({
          icon: "warning",
          title:
            "اختر صديقًا",
          text:
            "يجب اختيار صديق لبدء التحدي",
        });
        return;
      }

      let goal = Number(
        duelForm.goal
      );

      if (
        !Number.isFinite(goal) ||
        goal <= 0
      ) {
        Swal.fire({
          icon: "warning",
          title:
            "الهدف غير صحيح",
          text:
            "أدخل عدد ساعات صحيح",
        });
        return;
      }

      goal *= 60;

      const selectedFriend =
        friends.find(
          (friend) =>
            friend.id ===
            duelForm.friendId
        );

      if (!selectedFriend)
        return;

      const startedAt =
        new Date();

      const endsAt =
        new Date(
          startedAt.getTime() +
            24 *
              60 *
              60 *
              1000
        );

      const startDate =
        startedAt
          .toISOString()
          .split("T")[0];

      const endDate =
        endsAt
          .toISOString()
          .split("T")[0];

      const {
        data: challenge,
        error,
      } = await supabase
        .from(
          "friend_challenges"
        )
        .insert({
          creator_id: userId,
          title: `تحدي 1 ضد 1 مع ${selectedFriend.name}`,
          description:
            "تحدي فردي بين صديقين",
          challenge_type: "focus",
          target_value: goal,
          reward_points: 100,
          start_date: startDate,
          end_date: endDate,
          started_at:
            startedAt.toISOString(),
          ends_at:
            endsAt.toISOString(),
          status: "active",
          winner_user_id: null,
        })
        .select()
        .single();

      if (error) {
        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            "تعذر إنشاء التحدي",
        });
        return;
      }

      const {
        error: memberError,
      } = await supabase
        .from(
          "friend_challenge_members"
        )
        .insert([
          {
            challenge_id:
              challenge.id,
            user_id: userId,
            current_value: 0,
            is_completed: false,
            invitation_status:
              "accepted",
          },
          {
            challenge_id:
              challenge.id,
            user_id:
              selectedFriend.id,
            current_value: 0,
            is_completed: false,
            invitation_status:
              "pending",
          },
        ]);

      if (memberError) {
        await supabase
          .from(
            "friend_challenges"
          )
          .delete()
          .eq(
            "id",
            challenge.id
          );

        Swal.fire({
          icon: "error",
          title: "حدث خطأ",
          text:
            "تعذر إرسال تحدي المواجهة",
        });

        return;
      }

      setDuelForm({
        friendId: "",
        goal: "1",
      });

      const modal =
        document.getElementById(
          "duel-modal"
        );

      if (modal) {
        modal.style.display =
          "none";
      }

      document.body.classList.remove(
        "duel-modal-open"
      );

      Swal.fire({
        icon: "success",
        title:
          "تم إرسال التحدي ⚡",
        text: `تم إرسال تحدي 1 ضد 1 إلى ${selectedFriend.name}`,
        timer: 2000,
        showConfirmButton: false,
      });

      await loadAllData(false);
    };

  /* =========================================================
     Pagination Component
  ========================================================= */

  const renderPagination = ({
    page,
    totalPages,
    totalItems,
    onPageChange,
  }) => {
    if (
      totalItems <=
      ITEMS_PER_PAGE
    ) {
      return null;
    }

    return (
      <div className="friends-pagination">
        <button
          type="button"
          className="pagination-btn"
          disabled={page === 1}
          onClick={() =>
            onPageChange(page - 1)
          }
        >
          السابق
        </button>

        <div className="pagination-pages">
          {Array.from(
            {
              length: totalPages,
            },
            (_, index) =>
              index + 1
          ).map(
            (pageNumber) => (
              <button
                type="button"
                key={pageNumber}
                className={
                  pageNumber === page
                    ? "pagination-page active"
                    : "pagination-page"
                }
                onClick={() =>
                  onPageChange(
                    pageNumber
                  )
                }
              >
                {pageNumber}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="pagination-btn"
          disabled={
            page === totalPages
          }
          onClick={() =>
            onPageChange(
              page + 1
            )
          }
        >
          التالي
        </button>
      </div>
    );
  };

  /* =========================================================
     Challenge Card
  ========================================================= */

  const renderChallengeCard =
    (challenge) => {
      const Icon =
        challenge.icon;

      const winnerFriend =
        challenge.winner_user_id
          ? friends.find(
              (friend) =>
                friend.id ===
                challenge.winner_user_id
            )
          : null;

      return (
        <div
          className={`challenge-card ${challenge.theme}`}
          key={challenge.id}
        >
          <div className="challenge-card-top">
            <div className="challenge-icon">
              <Icon />
            </div>

            <span className="challenge-category">
              {challenge.category}
            </span>
          </div>

          <div className="challenge-content">
            <h3>
              {challenge.title}
            </h3>

            <p>
              {challenge.description}
            </p>

            <div className="challenge-details">
              <span>
                <FaCalendarAlt />
                {challenge.duration}{" "}
                يوم
              </span>

              <span>
                <FaBullseye />
                {challenge.target}{" "}
                {challenge.unit}
              </span>

              <span>
                <FaGift />
                {challenge.reward}{" "}
                نقطة
              </span>
            </div>

            <div className="challenge-progress">
              <div className="challenge-progress-header">
                <span>
                  التقدم
                </span>

                <strong>
                  {challenge.progress}%
                </strong>
              </div>

              <div className="challenge-progress-bar">
                <span
                  style={{
                    width: `${challenge.progress}%`,
                  }}
                />
              </div>

              <div className="challenge-progress-values">
                <span>
                  {
                    challenge.currentValue
                  }{" "}
                  {challenge.unit}
                </span>

                <span>
                  الهدف{" "}
                  {
                    challenge.target
                  }
                </span>
              </div>

              {challenge
                .participantsProgress
                ?.length > 1 && (
                <div className="challenge-members-progress">
                  {challenge.participantsProgress.map(
                    (member) => {
                      const memberFriend =
                        friends.find(
                          (friend) =>
                            friend.id ===
                            member.user_id
                        );

                      const memberName =
                        member.isCurrentUser
                          ? "أنت"
                          : memberFriend?.name ||
                            "مشارك";

                      const memberAvatar =
                        member.isCurrentUser
                          ? getAvatar(
                              currentProfile
                            )
                          : memberFriend?.avatar ||
                            getAvatar({
                              full_name:
                                memberName,
                            });

                      return (
                        <div
                          className={`challenge-member-progress ${
                            member.isCurrentUser
                              ? "current-user"
                              : ""
                          }`}
                          key={
                            member.id
                          }
                        >
                          <div className="challenge-member-progress-top">
                            <div className="challenge-member-info">
                              <img
                                src={
                                  memberAvatar
                                }
                                alt={
                                  memberName
                                }
                                className="challenge-member-avatar"
                              />

                              <span className="challenge-member-name">
                                {
                                  memberName
                                }
                              </span>
                            </div>

                            <strong>
                              {
                                member.progress
                              }%
                            </strong>
                          </div>

                          <div className="challenge-member-progress-bar">
                            <span
                              style={{
                                width: `${member.progress}%`,
                              }}
                            />
                          </div>

                          <div className="challenge-member-progress-value">
                            {
                              member.currentValue
                            }{" "}
                            {
                              challenge.unit
                            }
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

              {challenge.finished && (
                <div
                  className={`challenge-result ${
                    challenge.isWinner
                      ? "challenge-winner"
                      : challenge.isTie
                      ? "challenge-tie"
                      : challenge.hasWinner
                      ? "challenge-other-winner"
                      : "challenge-no-winner"
                  }`}
                >
                  {challenge.isWinner ? (
                    <>
                      <FaTrophy />
                      <strong>
                        أنت الفائز 🏆
                      </strong>
                    </>
                  ) : challenge.isTie ? (
                    <>
                      <FaUsers />
                      <strong>
                        تعادل 🤝
                      </strong>
                    </>
                  ) : challenge.hasWinner ? (
                    <>
                      <FaCrown />
                      <strong>
                        الفائز:{" "}
                        {
                          winnerFriend?.name
                        ||
                          "أحد المشاركين"}
                      </strong>
                    </>
                  ) : (
                    <>
                      <FaTimes />
                      <strong>
                        انتهى التحدي
                      </strong>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="challenge-footer">
              <div className="challenge-participants">
                <FaUsers />

                <span>
                  {
                    challenge.participants
                  }

                  {challenge.pendingParticipants >
                    0 && (
                    <>
                      {" "}
                      +{" "}
                      {
                        challenge.pendingParticipants
                      }
                    </>
                  )}{" "}
                  مشارك
                </span>
              </div>

              <button
                className="challenge-details-btn"
                onClick={() =>
                  handleOpenChallengeDetails(
                    challenge
                  )
                }
              >
                التفاصيل{" "}
                <FaChevronRight />
              </button>
            </div>

            {challenge.pending && (
              <div className="challenge-invitation">
                <div className="challenge-invitation-text">
                  <FaGift />
                  <span>
                    تمت دعوتك لهذا التحدي
                  </span>
                </div>

                <div className="challenge-invitation-actions">
                  <button
                    className="challenge-invite-btn"
                    onClick={() =>
                      handleAcceptChallenge(
                        challenge
                      )
                    }
                  >
                    <FaCheck />
                    قبول
                  </button>

                  <button
                    className="challenge-reject-btn"
                    onClick={() =>
                      handleRejectChallenge(
                        challenge
                      )
                    }
                  >
                    <FaTimes />
                    رفض
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };

  /* =========================================================
     Loading
  ========================================================= */

  if (loading) {
    return (
      <div className="friends-page">
        <Header />

        <div className="page-loading">
          <div className="page-loading-spinner">
            <FiRefreshCw />
          </div>

          <h3>
            جاري تحميل الأصدقاء...
          </h3>

          <p>
            تواصل مع أصدقائك وشاركهم رحلتك الدراسية
          </p>
        </div>
      </div>
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
          {/* Stats */}
          <div className="friends-stats-grid">
            <div className="friends-stat-card">
              <div className="friends-stat-icon purple">
                <FaUserFriends />
              </div>

              <div>
                <span>
                  إجمالي الأصدقاء
                </span>

                <strong>
                  {friends.length}
                </strong>
              </div>
            </div>

            <div className="friends-stat-card">
              <div className="friends-stat-icon gold">
                <FaStar />
              </div>

              <div>
                <span>
                  نقاط الأصدقاء
                </span>

                <strong>
                  {totalPoints.toLocaleString(
                    "ar-EG"
                  )}
                </strong>
              </div>
            </div>

            <div className="friends-stat-card">
              <div className="friends-stat-icon orange">
                <FaFire />
              </div>

              <div>
                <span>
                  الأصدقاء النشطون
                </span>

                <strong>
                  {
                    activeFriendsCount
                  }
                </strong>
              </div>
            </div>

            <div className="friends-stat-card">
              <div className="friends-stat-icon green">
                <FaTrophy />
              </div>

              <div>
                <span>
                  التحديات التي فزت بها
                </span>

                <strong>
                  {
                    wonChallengesCount
                  }
                </strong>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="friends-tabs">
            <button
              className={
                activeTab ===
                "requests"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "requests"
                )
              }
            >
              <FaUserPlus />
              طلبات الصداقة

              {requests.length >
                0 && (
                <span className="friends-tab-count">
                  {requests.length}
                </span>
              )}
            </button>

            <button
              className={
                activeTab ===
                "close"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "close"
                )
              }
            >
              <FaCrown />
              الأصدقاء المقربون
            </button>

            <button
              className={
                activeTab ===
                "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "all"
                )
              }
            >
              <FaUsers />
              كل الأصدقاء
            </button>

            <button
              className={
                activeTab ===
                "active"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "active"
                )
              }
            >
              <FaBolt />
              النشطون الآن
              <span className="friends-tab-dot" />
            </button>
          </div>

          {/* Requests */}
          {activeTab ===
            "requests" && (
            <section className="friends-section">
              <div className="section-heading">
                <div>
                  <h2>
                    طلبات الصداقة
                  </h2>
                  <p>
                    الطلبات الجديدة المرسلة إليك
                  </p>
                </div>

                <span className="section-count">
                  {requests.length}
                </span>
              </div>

              {requests.length ===
              0 ? (
                <div className="friends-empty-state">
                  <FaUserCheck />
                  <h3>
                    لا توجد طلبات
                  </h3>
                  <p>
                    عندما يرسل لك شخص طلب صداقة سيظهر هنا
                  </p>
                </div>
              ) : (
                <>
                  <div className="requests-list">
                    {paginatedRequests.items.map(
                      (request) => (
                        <div
                          className="request-card"
                          key={
                            request.id
                          }
                        >
                          <img
                            src={
                              request.avatar
                            }
                            alt={
                              request.name
                            }
                            className="request-avatar"
                          />

                          <div className="request-info">
                            <h3>
                              {
                                request.name
                              }
                            </h3>

                            <span>
                              {
                                request.code
                              }
                            </span>

                            <p>
                              {
                                request.info
                              }
                            </p>
                          </div>

                          <div className="request-actions">
                            <button
                              className="accept-request"
                              onClick={() =>
                                handleAcceptRequest(
                                  request
                                )
                              }
                            >
                              <FaCheck />
                              قبول
                            </button>

                            <button
                              className="reject-request"
                              onClick={() =>
                                handleRejectRequest(
                                  request
                                )
                              }
                            >
                              <FaTimes />
                              رفض
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {renderPagination({
                    ...paginatedRequests,
                    onPageChange:
                      setRequestsPage,
                  })}
                </>
              )}
            </section>
          )}

          {/* Friends */}
          {activeTab !==
            "requests" && (
            <section className="friends-section">
              <div className="section-heading">
                <div>
                  <h2>
                    {activeTab ===
                    "active"
                      ? "النشطون الآن"
                      : activeTab ===
                        "close"
                      ? "الأصدقاء المقربون"
                      : "كل الأصدقاء"}
                  </h2>

                  <p>
                    {activeTab ===
                    "active"
                      ? "الأصدقاء المتواجدون حاليًا"
                      : "تواصل وتنافس مع أصدقائك"}
                  </p>
                </div>

                <span className="section-count">
                  {
                    filteredFriends.length
                  }
                </span>
              </div>

              <div className="friends-toolbar">
                <div className="friends-search">
                  <FaSearch />

                  <input
                    type="text"
                    placeholder="ابحث باسم الصديق أو الكود..."
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target
                          .value
                      )
                    }
                  />
                </div>

                <button className="friends-sort-btn">
                  الأكثر نشاطًا{" "}
                  <FaChevronDown />
                </button>
              </div>

              {filteredFriends.length ===
              0 ? (
                <div className="friends-empty-state">
                  <FaUsers />
                  <h3>
                    لا يوجد أصدقاء
                  </h3>
                  <p>
                    لم نجد أصدقاء مطابقين للبحث الحالي
                  </p>
                </div>
              ) : (
                <>
                  <div className="friends-list">
                    {paginatedFriends.items.map(
                      (friend) => (
                        <div
                          className="friend-card"
                          key={
                            friend.id
                          }
                        >
                          <div className="friend-main">
                            <div className="friend-avatar-wrapper">
                              <img
                                src={
                                  friend.avatar
                                }
                                alt={
                                  friend.name
                                }
                                className="friend-avatar"
                              />

                              {friend.active && (
                                <span className="friend-online-dot" />
                              )}
                            </div>

                            <div className="friend-info">
                              <h3>
                                {
                                  friend.name
                                }
                              </h3>

                              <span className="friend-code">
                                {
                                  friend.code
                                }
                              </span>

                              <div className="friend-meta">
                                <span>
                                  المستوى{" "}
                                  {
                                    friend.level
                                  }
                                </span>

                                <span>
                                  <FaStar />{" "}
                                  {
                                    friend.points
                                  }{" "}
                                  نقطة
                                </span>

                                <span>
                                  <FaFire />{" "}
                                  {
                                    friend.sessions
                                  }{" "}
                                  جلسة
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="friend-actions">
                            <span
                              className={
                                friend.active
                                  ? "friend-status active"
                                  : "friend-status"
                              }
                            >
                              {friend.active
                                ? "نشط الآن"
                                : "غير متصل"}
                            </span>

                            <button
                              className="friend-remove-btn"
                              onClick={() =>
                                handleRemoveFriend(
                                  friend
                                )
                              }
                            >
                              <FaUserMinus />
                              إزالة
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {renderPagination({
                    ...paginatedFriends,
                    onPageChange:
                      setFriendsPage,
                  })}
                </>
              )}
            </section>
          )}

          {/* Challenges Hero */}
          <section className="challenges-hero">
            <div className="challenges-hero-content">
              <div className="challenges-hero-icon">
                <FaTrophy />
              </div>

              <div>
                <h2>
                  تحديات الأصدقاء
                </h2>

                <p>
                  تنافس مع أصدقائك، حافظ على حماسك، وارفع مستواك
                </p>
              </div>
            </div>

            <button
              className="create-challenge-btn"
              onClick={
                openChallengeModal
              }
            >
              <FaPlus />
              إنشاء تحدي
            </button>
          </section>

          {/* Pending Challenges */}
          <section className="friends-section challenges-section">
            <div className="section-heading">
              <div>
                <h2>
                  دعوات التحديات
                </h2>

                <p>
                  التحديات التي تمت دعوتك إليها
                </p>
              </div>

              <span className="section-count">
                {
                  pendingChallengeInvitations.length
                }
              </span>
            </div>

            {pendingChallengeInvitations.length ===
            0 ? (
              <div className="friends-empty-state">
                <FaGift />
                <h3>
                  لا توجد دعوات
                </h3>
                <p>
                  ستظهر هنا دعوات التحديات الجديدة
                </p>
              </div>
            ) : (
              <>
                <div className="challenges-grid">
                  {paginatedPendingChallenges.items.map(
                    renderChallengeCard
                  )}
                </div>

                {renderPagination({
                  ...paginatedPendingChallenges,
                  onPageChange:
                    setPendingChallengesPage,
                })}
              </>
            )}
          </section>

          {/* Active Challenges */}
          <section className="friends-section challenges-section">
            <div className="section-heading">
              <div>
                <h2>
                  التحديات النشطة
                </h2>

                <p>
                  تحدياتك التي ما زالت مستمرة
                </p>
              </div>

              <span className="section-count">
                {
                  activeChallenges.length
                }
              </span>
            </div>

            {activeChallenges.length ===
            0 ? (
              <div className="friends-empty-state">
                <FaBolt />
                <h3>
                  لا توجد تحديات نشطة
                </h3>

                <p>
                  يمكنك إنشاء تحدي جديد والبدء مع أصدقائك
                </p>

                <button
                  className="create-challenge-btn"
                  onClick={
                    openChallengeModal
                  }
                >
                  <FaPlus />
                  إنشاء تحدي
                </button>
              </div>
            ) : (
              <>
                <div className="challenges-grid">
                  {paginatedActiveChallenges.items.map(
                    renderChallengeCard
                  )}
                </div>

                {renderPagination({
                  ...paginatedActiveChallenges,
                  onPageChange:
                    setActiveChallengesPage,
                })}
              </>
            )}
          </section>

          {/* Won Challenges */}
          <section className="friends-section challenges-section">
            <div className="section-heading">
              <div>
                <h2>
                  التحديات التي فزت بها 🏆
                </h2>

                <p>
                  إنجازاتك في تحديات الأصدقاء
                </p>
              </div>

              <span className="section-count">
                {
                  wonChallenges.length
                }
              </span>
            </div>

            {wonChallenges.length ===
            0 ? (
              <div className="friends-empty-state">
                <FaTrophy />
                <h3>
                  لم تفز بتحديات بعد
                </h3>

                <p>
                  استمر في التحدي وستظهر انتصاراتك هنا
                </p>
              </div>
            ) : (
              <>
                <div className="challenges-grid">
                  {paginatedWonChallenges.items.map(
                    renderChallengeCard
                  )}
                </div>

                {renderPagination({
                  ...paginatedWonChallenges,
                  onPageChange:
                    setWonChallengesPage,
                })}
              </>
            )}
          </section>

          {/* Finished Challenges */}
          <section className="friends-section challenges-section">
            <div className="section-heading">
              <div>
                <h2>
                  التحديات المنتهية
                </h2>

                <p>
                  التحديات التي انتهت مدتها
                </p>
              </div>

              <span className="section-count">
                {
                  otherFinishedChallenges.length
                }
              </span>
            </div>

            {otherFinishedChallenges.length ===
            0 ? (
              <div className="friends-empty-state">
                <FaCalendarAlt />
                <h3>
                  لا توجد تحديات منتهية
                </h3>

                <p>
                  ستظهر هنا التحديات بعد انتهاء مدتها
                </p>
              </div>
            ) : (
              <>
                <div className="challenges-grid">
                  {paginatedFinishedChallenges.items.map(
                    renderChallengeCard
                  )}
                </div>

                {renderPagination({
                  ...paginatedFinishedChallenges,
                  onPageChange:
                    setFinishedChallengesPage,
                })}
              </>
            )}
          </section>

          {/* Add Friend */}
          <section
            className="add-friend-section"
            id="add-friend-section"
          >
            <div className="add-friend-header">
              <div className="add-friend-icon">
                <FaUserPlus />
              </div>

              <div>
                <h2>
                  أضف صديقًا جديدًا
                </h2>

                <p>
                  ابحث باستخدام كود الطالب أو رقم الموبايل
                </p>
              </div>
            </div>

            <div className="add-friend-form">
              <div className="student-code-input">
                <FaSearch />

                <input
                  type="text"
                  placeholder="كود الطالب أو رقم الموبايل"
                  value={
                    studentCode
                  }
                  onChange={(event) =>
                    setStudentCode(
                      event.target
                        .value
                    )
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      handleSearchStudent();
                    }
                  }}
                />
              </div>

              <button
                className="student-search-btn"
                onClick={
                  handleSearchStudent
                }
              >
                بحث
              </button>
            </div>

            {searchMessage && (
              <div className="student-search-message">
                {
                  searchMessage
                }
              </div>
            )}

            {searchedStudent && (
              <div className="searched-student-card">
                <img
                  src={
                    searchedStudent.avatar
                  }
                  alt={
                    searchedStudent.name
                  }
                />

                <div>
                  <h3>
                    {
                      searchedStudent.name
                    }
                  </h3>

                  <span>
                    {
                      searchedStudent.code
                    }
                  </span>

                  {searchedStudent.section && (
                    <p>
                      {
                        searchedStudent.section
                      }
                    </p>
                  )}
                </div>

                <button
                  className="add-searched-student-btn"
                  onClick={
                    handleAddFriend
                  }
                  disabled={
                    requestSent
                  }
                >
                  {requestSent ? (
                    <>
                      <FaCheck />
                      تم الإرسال
                    </>
                  ) : (
                    <>
                      <FaUserPlus />
                      إضافة صديق
                    </>
                  )}
                </button>
              </div>
            )}
          </section>

          {/* Ranking */}
          <section className="friends-section ranking-section">
            <div className="section-heading">
              <div>
                <h2>
                  ترتيب الأصدقاء
                </h2>

                <p>
                  أكثر أصدقائك تحقيقًا للنقاط
                </p>
              </div>
              <FaChartLine />
            </div>
            <div className="ranking-list">
              {[...friends]
                .sort(
                  (a, b) =>
                    b.points -
                    a.points
                )
                .slice(0, 3)
                .map(
                  (
                    friend,
                    index
                  ) => (
                    <div
                      className="ranking-item"
                      key={
                        friend.id
                      }
                    >
                      <div className="ranking-position">
                        {index ===
                        0 ? (
                          <FaCrown />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <img
                        src={
                          friend.avatar
                        }
                        alt={
                          friend.name
                        }
                        className="ranking-avatar"
                      />

                      <div className="ranking-info">
                        <h3>
                          {
                            friend.name
                          }
                        </h3>

                        <span>
                          المستوى{" "}
                          {
                            friend.level
                          }
                        </span>
                      </div>

                      <strong className="ranking-points">
                        <FaStar />{" "}
                        {
                          friend.points
                        }
                      </strong>
                    </div>
                  )
                )}

              {friends.length ===
                0 && (
                <div className="friends-empty-state">
                  <FaMedal />
                  <p>
                    لا يوجد ترتيب بعد
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Activity */}
          <section className="friends-section activity-section">
            <div className="section-heading">
              <div>
                <h2>
                  النشاط الأخير
                </h2>

                <p>
                  آخر ما يحدث بينك وبين أصدقائك
                </p>
              </div>

              <FaClock />
            </div>

            {activities.length ===
            0 ? (
              <div className="friends-empty-state">
                <FaClock />
                <h3>
                  لا يوجد نشاط حديث
                </h3>

                <p>
                  سيظهر نشاطك ونشاط أصدقائك هنا
                </p>
              </div>
            ) : (
              <div className="activity-list">
                {activities
                  .slice(0, 5)
                  .map(
                    (
                      activity
                    ) => (
                      <div
                        className="activity-item"
                        key={
                          activity.id
                        }
                      >
                        <img
                          src={
                            activity.avatar
                          }
                          alt={
                            activity.userName
                          }
                          className="activity-avatar"
                        />

                        <div className="activity-content">
                          <h3>
                            {
                              activity.title
                            }
                          </h3>

                          <p>
                            {
                              activity.description
                            }
                          </p>

                          <span>
                            {
                              activity.userName
                            }
                          </span>
                        </div>

                        {activity.points &&
                          Number(
                            activity.points
                          ) >
                            0 && (
                            <strong className="activity-points">
                              +
                              {
                                activity.points
                              }
                            </strong>
                          )}
                      </div>
                    )
                  )}
              </div>
            )}
          </section>

          {/* Footer CTA */}
          <section className="friends-footer-cta">
            <div>
              <FaUsers />

              <div>
                <h2>
                  اجعل رحلتك الدراسية ممتعة مع أصدقائك
                </h2>

                <p>
                  أضف أصدقاءك وابدأ التحديات وحقق أهدافك معًا
                </p>
              </div>
            </div>

            <button
              onClick={
                openChallengeModal
              }
            >
              <FaTrophy />
              ابدأ تحديًا
            </button>
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
            if (
              event.target ===
              event.currentTarget
            ) {
              setChallengeModal(
                false
              );
            }
          }}
        >
          <div className="friends-modal">
            <div className="friends-modal-header">
              <div>
                <h2>
                  إنشاء تحدي جديد
                </h2>

                <p>
                  أنشئ تحديًا وادعُ أصدقاءك
                </p>
              </div>

              <button
                onClick={() =>
                  setChallengeModal(
                    false
                  )
                }
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={
                handleCreateChallenge
              }
            >
              <div className="form-group">
                <label>
                  اسم التحدي
                </label>

                <input
                  type="text"
                  name="title"
                  placeholder="مثال: سباق التركيز"
                  value={
                    challengeForm.title
                  }
                  onChange={
                    handleChallengeFormChange
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  نوع التحدي
                </label>

                <div className="challenge-type-options">
                  {[
                    "focus",
                    "lessons",
                    "points",
                    "streak",
                  ].map(
                    (type) => {
                      const data =
                        getChallengeTypeData(
                          type
                        );

                      const Icon =
                        data.icon;

                      return (
                        <button
                          type="button"
                          key={type}
                          className={
                            challengeForm.type ===
                            type
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            handleChallengeTypeChange(
                              type
                            )
                          }
                        >
                          <Icon />
                          <span>
                            {
                              data.label
                            }
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    المدة بالأيام
                  </label>

                  <input
                    type="number"
                    min="1"
                    name="duration"
                    value={
                      challengeForm.duration
                    }
                    onChange={
                      handleChallengeFormChange
                    }
                  />
                </div>

                <div className="form-group">
                  <label>
                    الهدف{" "}
                    {challengeForm.type ===
                      "focus" &&
                      "بالساعات"}
                  </label>

                  <input
                    type="number"
                    min="1"
                    step={
                      challengeForm.type ===
                      "focus"
                        ? "0.5"
                        : "1"
                    }
                    name="target"
                    value={
                      challengeForm.target
                    }
                    onChange={
                      handleChallengeFormChange
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  دعوة الأصدقاء
                </label>

                {friends.length ===
                0 ? (
                  <div className="no-friends-invite">
                    لا يوجد أصدقاء لإضافتهم
                  </div>
                ) : (
                  <>
                    <div className="invite-friends-list">
                      {paginatedInviteFriends.items.map(
                        (friend) => (
                          <button
                            type="button"
                            className={
                              selectedInviteFriends.includes(
                                friend.id
                              )
                                ? "invite-friend selected"
                                : "invite-friend"
                            }
                            key={
                              friend.id
                            }
                            onClick={() =>
                              toggleInviteFriend(
                                friend.id
                              )
                            }
                          >
                            <img
                              src={
                                friend.avatar
                              }
                              alt={
                                friend.name
                              }
                            />

                            <div>
                              <strong>
                                {
                                  friend.name
                                }
                              </strong>

                              <span>
                                {
                                  friend.code
                                }
                              </span>
                            </div>

                            {selectedInviteFriends.includes(
                              friend.id
                            ) && (
                              <FaCheck />
                            )}
                          </button>
                        )
                      )}
                    </div>

                    {renderPagination({
                      ...paginatedInviteFriends,
                      onPageChange:
                        setInviteFriendsPage,
                    })}
                  </>
                )}
              </div>

              <div className="friends-modal-actions">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() =>
                    setChallengeModal(
                      false
                    )
                  }
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="modal-submit-btn"
                >
                  <FaPlus />
                  إنشاء التحدي
                </button>
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
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedChallenge(
                null
              );
            }
          }}
        >
          <div className="friends-modal challenge-details-modal">
            <div className="friends-modal-header">
              <div>
                <h2>
                  {
                    selectedChallenge.title
                  }
                </h2>

                <p>
                  تفاصيل التحدي
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedChallenge(
                    null
                  )
                }
              >
                <FaTimes />
              </button>
            </div>

            <div className="challenge-modal-summary">
              <div>
                <span>
                  الهدف
                </span>

                <strong>
                  {
                    selectedChallenge.target
                  }{" "}
                  {
                    selectedChallenge.unit
                  }
                </strong>
              </div>

              <div>
                <span>
                  المكافأة
                </span>

                <strong>
                  {
                    selectedChallenge.reward
                  }{" "}
                  نقطة
                </strong>
              </div>

              <div>
                <span>
                  التقدم
                </span>

                <strong>
                  {
                    selectedChallenge.progress
                  }
                  %
                </strong>
              </div>
            </div>

            {selectedChallenge.finished && (
              <div
                className={`challenge-result-modal ${
                  selectedChallenge.isWinner
                    ? "result-winner"
                    : selectedChallenge.isTie
                    ? "result-tie"
                    : selectedChallenge.hasWinner
                    ? "result-other-winner"
                    : "result-no-winner"
                }`}
              >
                {selectedChallenge.isWinner ? (
                  <>
                    <FaTrophy />
                    <span>
                      أنت الفائز في هذا التحدي 🏆
                    </span>
                  </>
                ) : selectedChallenge.isTie ? (
                  <>
                    <FaUsers />
                    <span>
                      انتهى التحدي بالتعادل 🤝
                    </span>
                  </>
                ) : selectedChallenge.hasWinner ? (
                  <>
                    <FaCrown />
                    <span>
                      الفائز:{" "}
                      {friends.find(
                        (friend) =>
                          friend.id ===
                          selectedChallenge.winner_user_id
                      )?.name ||
                        "أحد المشاركين"}
                    </span>
                  </>
                ) : (
                  <>
                    <FaTimes />
                    <span>
                      انتهى التحدي
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="challenge-details-progress">
              <div className="challenge-progress-header">
                <span>
                  تقدمك
                </span>

                <strong>
                  {
                    selectedChallenge.currentValue
                  }{" "}
                  /{" "}
                  {
                    selectedChallenge.target
                  }
                </strong>
              </div>

              <div className="challenge-progress-bar">
                <span
                  style={{
                    width: `${selectedChallenge.progress}%`,
                  }}
                />
              </div>
            </div>

            <div className="challenge-leaderboard">
              <h3>
                <FaTrophy />
                المشاركون
              </h3>

              {paginatedChallengeMembers.items.map(
                (
                  member,
                  index
                ) => {
                  const friend =
                    friends.find(
                      (item) =>
                        item.id ===
                        member.user_id
                    );

                  const isCurrentUser =
                    member.user_id ===
                    userId;

                  const value =
                    getChallengeDisplayValue(
                      member.current_value,
                      selectedChallenge.challenge_type
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

                  const isWinner =
                    selectedChallenge.winner_user_id ===
                    member.user_id;

                  const realIndex =
                    (paginatedChallengeMembers.page -
                      1) *
                      ITEMS_PER_PAGE +
                    index;

                  return (
                    <div
                      className="challenge-leaderboard-item"
                      key={
                        member.id
                      }
                    >
                      <span className="leaderboard-rank">
                        {realIndex ===
                          0 &&
                        selectedChallenge.finished &&
                        isWinner ? (
                          <FaCrown />
                        ) : (
                          realIndex +
                          1
                        )}
                      </span>

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
                        <strong>
                          {isCurrentUser
                            ? "أنت"
                            : friend?.name ||
                              "طالب"}
                        </strong>

                        <span>
                          {member.invitation_status ===
                          "pending"
                            ? "في انتظار القبول"
                            : `${value} ${selectedChallenge.unit}`}
                        </span>
                      </div>

                      <strong>
                        {
                          percentage
                        }%
                      </strong>
                    </div>
                  );
                }
              )}

              {renderPagination({
                ...paginatedChallengeMembers,
                onPageChange:
                  setChallengeMembersPage,
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          Duel Trigger
      ===================================================== */}

      <div className="friends-duel-trigger">
        <button
          onClick={() => {
            if (
              friends.length ===
              0
            ) {
              Swal.fire({
                icon: "info",
                title:
                  "أضف صديقًا أولاً",
                text:
                  "يجب أن يكون لديك صديق لبدء تحدي 1 ضد 1",
              });

              return;
            }

            setDuelForm(
              (prev) => ({
                ...prev,
                friendId:
                  prev.friendId ||
                  friends[0]?.id ||
                  "",
              })
            );

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
          <FaBolt />
          تحدي 1 ضد 1
        </button>
      </div>

      {/* =====================================================
          Duel Modal
      ===================================================== */}

      <div
        className="friends-modal-overlay"
        id="duel-modal"
        style={{
          display: "none",
        }}
        onClick={(event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
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
              <h2>
                تحدي 1 ضد 1 ⚡
              </h2>

              <p>
                تحدى أحد أصدقائك وشوف مين الأفضل
              </p>
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

          <form
            onSubmit={
              handleStartDuel
            }
          >
            <div className="form-group">
              <label>
                اختر الصديق
              </label>

              <select
                name="friendId"
                value={
                  duelForm.friendId
                }
                onChange={
                  handleDuelFormChange
                }
              >
                <option value="">
                  اختر صديقًا
                </option>

                {friends.map(
                  (friend) => (
                    <option
                      value={
                        friend.id
                      }
                      key={
                        friend.id
                      }
                    >
                      {
                        friend.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="form-group">
              <label>
                الهدف بالساعات
              </label>

              <input
                type="number"
                min="1"
                step="0.5"
                name="goal"
                value={
                  duelForm.goal
                }
                onChange={
                  handleDuelFormChange
                }
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

              <button
                type="submit"
                className="modal-submit-btn"
              >
                <FaBolt />
                إرسال التحدي
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Friends;