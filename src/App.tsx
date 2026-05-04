import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { generatePepperoniResponse } from "./services/geminiService";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  increment,
  deleteDoc,
  getDocFromServer,
  where,
  limit,
  collectionGroup,
  writeBatch,
} from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import {
  Flame,
  MessageCircle,
  Heart,
  Share2,
  Plus,
  LogOut,
  User as UserIcon,
  Users,
  TrendingUp,
  Clock,
  Filter,
  Trash2,
  AlertCircle,
  ChevronLeft,
  Send,
  Search,
  Zap,
  Mail,
  Lock,
  X,
  Loader2,
  Pizza,
  ChefHat,
  LayoutGrid,
  Image as ImageIcon,
  Music,
  Camera,
  Mic,
  Code,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import {
  auth,
  db,
  signInWithGoogle,
  logout,
  signInAnonymously,
  signUpWithEmail,
  signInWithEmail,
  updateUserProfile,
  removeUserAccount,
} from "./firebase";
import { cn } from "./lib/utils";
import {
  Rant,
  Comment,
  UserProfile,
  OperationType,
  FirestoreErrorInfo,
  Group,
  Report,
  SiteSettings,
} from "./types";

// --- Admin Constants ---
const ADMIN_EMAIL = "maphangabowe@gmail.com";

// --- Error Handling ---
function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const MOODS = ["😠", "😤", "🤬", "😫", "🙄", "🤯", "🫠"];
const CATEGORIES = [
  "Work",
  "Life",
  "Tech",
  "Traffic",
  "Politics",
  "Sport",
  "Music",
  "Fashion",
  "Other",
];

const Navbar = ({
  user,
  userProfile,
  onOpenAuth,
}: {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  onOpenAuth: () => void;
}) => {
  return (
    <nav className="sticky top-0 z-50 bg-reddit-card border-b border-reddit-border">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:rotate-12 transition-transform duration-300">
            <Pizza size={20} className="fill-white/20" />
          </div>
          <span className="text-xl font-display font-black text-reddit-text tracking-tighter italic group-hover:text-brand-500 transition-colors uppercase">
            PEPPERONI
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/groups"
            className="text-reddit-meta hover:text-reddit-text transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-reddit-hover"
          >
            <Users size={18} />
            <span className="text-xs font-bold hidden md:block">
              Communities
            </span>
          </Link>

          {userProfile?.isAdmin && (
            <Link
              to="/secret-pepper-panel"
              className="text-brand-500 hover:text-brand-400 transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-reddit-hover border border-brand-500/20"
            >
              <span className="text-xs font-bold hidden md:block">
                Admin Panel
              </span>
            </Link>
          )}

          {user ? (
            <>
              <Link
                to={`/profile/${user.uid}`}
                className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-reddit-hover transition-colors"
              >
                <img
                  src={
                    user.isAnonymous
                      ? `https://ui-avatars.com/api/?name=G&background=random`
                      : user.photoURL ||
                        `https://ui-avatars.com/api/?name=${user.displayName}`
                  }
                  alt={user.displayName || "User"}
                  className="w-6 h-6 rounded-full border border-reddit-border"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xs font-medium text-reddit-text hidden md:block">
                  {user.isAnonymous ? "Guest" : user.displayName}
                </span>
              </Link>
              <button onClick={logout} className="btn-ghost" title="Logout">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={onOpenAuth} className="btn-primary">
                <UserIcon size={16} />
                <span>Log In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

const AuthModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
        if (email === ADMIN_EMAIL) {
          navigate("/secret-pepper-panel");
        }
      } else {
        await signUpWithEmail(email, password);
        if (displayName) {
          await updateUserProfile(displayName);
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result?.user.email === ADMIN_EMAIL) {
        navigate("/secret-pepper-panel");
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md reddit-card bg-reddit-card p-8 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-reddit-meta hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center text-white mx-auto mb-4">
            <Flame size={24} fill="currentColor" />
          </div>
          <h2 className="text-2xl font-bold text-reddit-text">
            {isLogin ? "Welcome Back" : "Join the Void"}
          </h2>
          <p className="text-reddit-meta text-sm mt-2">
            {isLogin
              ? "Good to see you again."
              : "Start sharing your frustrations."}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-500 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest pl-1">
                Display Name
              </label>
              <div className="relative">
                <UserIcon
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-reddit-meta"
                  size={16}
                />
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full reddit-input pl-10 h-10 text-sm"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest pl-1">
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-reddit-meta"
                size={16}
              />
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full reddit-input pl-10 h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest pl-1">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-reddit-meta"
                size={16}
              />
              <input
                type="password"
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full reddit-input pl-10 h-10 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full h-10 text-base mt-4"
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto" size={20} />
            ) : isLogin ? (
              "Log In"
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-reddit-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-reddit-card px-2 text-reddit-meta">
              Or continue with
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full h-10 border border-reddit-border rounded-full flex items-center justify-center gap-2 text-sm font-medium text-reddit-text hover:bg-reddit-hover transition-colors"
          >
            <img
              src="https://www.google.com/favicon.ico"
              className="w-4 h-4"
              alt="Google"
            />
            Continue with Google
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-reddit-meta">
          {isLogin ? "New to Pepperoni?" : "Already have an account?"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-1 text-brand-500 font-bold hover:underline"
          >
            {isLogin ? "Create Account" : "Log In"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

const RantForm = ({ user }: { user: FirebaseUser }) => {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Rant["category"]>("Life");
  const [intensity, setIntensity] = useState(5);
  const [mood, setMood] = useState("😠");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [mediaLoading, setMediaLoading] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "audio",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (Firestore 1MB limit for entire doc, so keep media small - ~700KB max for Base64)
    if (file.size > 800000) {
      alert(
        "File too large. Please keep spicy media under 800KB for the Pepperoni ovens.",
      );
      return;
    }

    setMediaLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === "image") setImageUrl(base64String);
      else setAudioUrl(base64String);
      setMediaLoading(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const q = query(collection(db, "groups"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAvailableGroups(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Group),
      );
    });
    return () => unsubscribe();
  }, []);

  const moods = MOODS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const pepperoniResponse = await generatePepperoniResponse(content.trim(), mood);
      const group = availableGroups.find((g) => g.id === selectedGroup);
      await addDoc(collection(db, "rants"), {
        authorUid: user.uid,
        authorName: isAnonymous ? "Anonymous Pepper" : user.displayName,
        authorPhoto: isAnonymous ? null : user.photoURL,
        content: content.trim(),
        category,
        mood,
        isAnonymous,
        intensity,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
        groupId: selectedGroup || null,
        groupName: group ? group.displayName : null,
        imageUrl: imageUrl || null,
        audioUrl: audioUrl || null,
        pepperoniResponse,
      });

      if (selectedGroup) {
        await updateDoc(doc(db, "groups", selectedGroup), {
          rantsCount: increment(1),
        });
      }

      setContent("");
      setIntensity(5);
      setMood("😠");
      setIsAnonymous(false);
      setSelectedGroup("");
      setImageUrl("");
      setAudioUrl("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "rants");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="reddit-card p-3 mb-4"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <img
            src={
              isAnonymous
                ? `https://ui-avatars.com/api/?name=A&background=random`
                : user.photoURL || ""
            }
            className="w-10 h-10 rounded-full border border-reddit-border shrink-0"
            referrerPolicy="no-referrer"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Create a Post"
            className="w-full bg-reddit-hover border border-reddit-border rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm resize-none min-h-[100px] text-reddit-text placeholder:text-reddit-meta"
            maxLength={1000}
          />
        </div>

        {/* Media Preview */}
        {(imageUrl || audioUrl) && (
          <div className="flex gap-4 p-2 bg-reddit-bg rounded-lg border border-reddit-border">
            {imageUrl && (
              <div className="relative group">
                <img
                  src={imageUrl}
                  className="w-20 h-20 object-cover rounded-md border border-reddit-border"
                />
                <button
                  onClick={() => setImageUrl("")}
                  className="absolute -top-2 -right-2 bg-reddit-card text-reddit-meta hover:text-white rounded-full p-1 border border-reddit-border"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            {audioUrl && (
              <div className="relative group flex items-center gap-2 p-2">
                <div className="w-8 h-8 rounded bg-brand-500/20 flex items-center justify-center text-brand-500">
                  <Mic size={16} />
                </div>
                <span className="text-[10px] text-reddit-meta font-bold uppercase tracking-widest">
                  Audio Loaded
                </span>
                <button
                  onClick={() => setAudioUrl("")}
                  className="absolute -top-2 -right-2 bg-reddit-card text-reddit-meta hover:text-white rounded-full p-1 border border-reddit-border"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest">
            Mood
          </span>
          <div className="flex gap-1">
            {moods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(m)}
                className={cn(
                  "mood-btn w-8 h-8 text-base",
                  mood === m && "active",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-reddit-border">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest">
                Community
              </span>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="bg-reddit-hover border border-reddit-border rounded-md text-xs font-medium px-2 py-1 focus:ring-1 focus:ring-brand-500 text-reddit-text"
              >
                <option value="">Global Feed</option>
                {availableGroups.map((group) => (
                  <option
                    key={group.id}
                    value={group.id}
                    className="bg-reddit-card"
                  >
                    p/{group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest">
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="bg-reddit-hover border border-reddit-border rounded-md text-xs font-medium px-2 py-1 focus:ring-1 focus:ring-brand-500 text-reddit-text"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-reddit-card">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest">
                Spice Level
              </span>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(parseInt(e.target.value))}
                className="accent-brand-500 w-20 h-1 bg-reddit-border rounded-lg appearance-none cursor-pointer"
              />
              <span
                className={cn(
                  "text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded text-white",
                  intensity > 7
                    ? "bg-red-500"
                    : intensity > 4
                      ? "bg-orange-500"
                      : "bg-spicy-gold",
                )}
              >
                {intensity}
              </span>
            </div>

            <div className="flex items-center gap-2 border-l border-reddit-border pl-4">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={imageInputRef}
                onChange={(e) => handleFileChange(e, "image")}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className={cn(
                  "p-2 rounded text-reddit-meta hover:bg-reddit-hover transition-colors",
                  imageUrl && "text-brand-500 bg-brand-500/10",
                )}
                title="Add Image"
              >
                <ImageIcon size={18} />
              </button>

              <input
                type="file"
                accept="audio/*"
                className="hidden"
                ref={audioInputRef}
                onChange={(e) => handleFileChange(e, "audio")}
              />
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className={cn(
                  "p-2 rounded text-reddit-meta hover:bg-reddit-hover transition-colors",
                  audioUrl && "text-brand-500 bg-brand-500/10",
                )}
                title="Add Voice Rant"
              >
                <Mic size={18} />
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer group">
              <div
                className={cn(
                  "w-8 h-4 rounded-full transition-all relative",
                  isAnonymous ? "bg-brand-500" : "bg-reddit-border",
                )}
              >
                <div
                  className={cn(
                    "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                    isAnonymous ? "left-4.5" : "left-0.5",
                  )}
                />
              </div>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="hidden"
              />
              <span className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest group-hover:text-reddit-text transition-colors">
                Anonymous
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Baking...</span>
              </>
            ) : (
              <>
                <Flame size={16} />
                <span>Bake Rant</span>
              </>
            )}
          </button>
        </div>
        <p className="text-[9px] text-reddit-meta italic mt-2 text-right">
          * Chef Pepperoni will personally sample and critique your spicy rants.
        </p>
      </form>
    </motion.div>
  );
};

const RantCard = ({
  rant,
  currentUser,
}: {
  rant: Rant;
  currentUser: FirebaseUser | null;
  key?: React.Key;
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number }[]
  >([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;
    const likeId = `${currentUser.uid}_${rant.id}`;
    const unsubscribe = onSnapshot(doc(db, "likes", likeId), (doc) => {
      setIsLiked(doc.exists());
    });
    return () => unsubscribe();
  }, [rant.id, currentUser]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return signInWithGoogle();

    // Fire particles effect
    const rect = e.currentTarget.getBoundingClientRect();
    const newParticles = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() + i,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }));
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.find((np) => np.id === p.id)),
      );
    }, 800);

    const likeId = `${currentUser.uid}_${rant.id}`;
    try {
      if (isLiked) {
        await deleteDoc(doc(db, "likes", likeId));
        await updateDoc(doc(db, "rants", rant.id), {
          likesCount: increment(-1),
        });
      } else {
        await setDoc(doc(db, "likes", likeId), {
          rantId: rant.id,
          userUid: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "rants", rant.id), {
          likesCount: increment(1),
        });

        // Award points to the author (if not self)
        if (rant.authorUid !== currentUser.uid) {
          await updateDoc(doc(db, "users", rant.authorUid), {
            supporterPoints: increment(1),
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "likes");
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || currentUser.uid !== rant.authorUid) return;
    if (!window.confirm("Are you sure you want to delete this rant?")) return;

    try {
      await deleteDoc(doc(db, "rants", rant.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rants/${rant.id}`);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/rant/${rant.id}`;
    const shareData = {
      title: "Spicy Rant on Pepperoni 🌶️",
      text: `${rant.authorName} is venting: "${rant.content.substring(0, 50)}..."`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard! Share the heat.");
      }
    } catch (err) {
      console.log("Share failed:", err);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onClick={() => navigate(`/rant/${rant.id}`)}
      className="reddit-card flex group relative overflow-hidden"
    >
      {/* Report Button overlay */}
      {currentUser && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <ReportButton
            currentUser={currentUser}
            contentId={rant.id}
            contentType="rant"
            targetUid={rant.authorUid}
          />
        </div>
      )}

      {/* Vote Column */}
      <div className="w-10 bg-reddit-bg/50 flex flex-col items-center py-2 gap-1 border-r border-reddit-border">
        <button
          onClick={handleLike}
          className={cn("vote-btn upvote relative", isLiked && "active")}
        >
          <Flame size={20} fill={isLiked ? "currentColor" : "none"} />
          <span className="text-xs font-bold font-mono">{rant.likesCount}</span>

          {/* Particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="fire-particle text-brand-500"
              style={{ left: p.x, top: p.y }}
            >
              <Flame size={16} fill="currentColor" />
            </div>
          ))}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-3">
        <div className="flex items-center gap-2 mb-2">
          <img
            src={
              rant.authorPhoto ||
              `https://ui-avatars.com/api/?name=A&background=random`
            }
            className="w-5 h-5 rounded-full border border-reddit-border"
            referrerPolicy="no-referrer"
          />
          <div className="flex items-center gap-1 text-[10px]">
            <span className="font-bold text-reddit-text">
              {rant.authorName}
              {rant.isAnonymous && (
                <span className="ml-1 text-reddit-meta">(Anon)</span>
              )}
            </span>
            <span className="text-reddit-meta">•</span>
            {rant.groupName && (
              <>
                <Link
                  to={`/g/${rant.groupId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-brand-500 hover:underline"
                >
                  p/{rant.groupName}
                </Link>
                <span className="text-reddit-meta">•</span>
              </>
            )}
            <span className="text-reddit-meta">
              {rant.createdAt
                ? formatDistanceToNow(rant.createdAt.toDate(), {
                    addSuffix: true,
                  })
                : "Just now"}
            </span>
            <span className="text-reddit-meta">•</span>
            <span
              className={cn(
                "font-bold",
                rant.intensity > 7
                  ? "text-red-500"
                  : rant.intensity > 4
                    ? "text-orange-500"
                    : "text-spicy-gold",
              )}
            >
              Scoville {rant.intensity}
            </span>
          </div>
        </div>

        <div className="flex gap-3 mb-3">
          {rant.mood && (
            <div className="text-2xl shrink-0 mt-1">{rant.mood}</div>
          )}
          <p className="text-reddit-text text-sm leading-relaxed whitespace-pre-wrap flex-1">
            {rant.content}
          </p>
        </div>

        {/* Media Display */}
        {rant.imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden border border-reddit-border bg-reddit-bg">
            <img
              src={rant.imageUrl}
              alt="Rant media"
              className="w-full h-auto max-h-[400px] object-contain"
            />
          </div>
        )}

        {/* Pepperoni Response */}
        {rant.pepperoniResponse && (
          <div className="mb-3 p-3 rounded-lg bg-brand-500/5 border border-brand-500/10 flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shrink-0 mt-0.5">
              <ChefHat size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase font-black text-brand-500 tracking-wider mb-1">Chef's Spicy Note</div>
              <p className="text-xs italic text-reddit-text font-serif leading-relaxed">
                "{rant.pepperoniResponse}"
              </p>
            </div>
          </div>
        )}

        {rant.audioUrl && (
          <div className="mb-3 p-2 rounded-lg bg-reddit-bg border border-reddit-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 shrink-0">
              <Mic size={16} />
            </div>
            <audio controls className="h-6 flex-1 custom-audio-player">
              <source src={rant.audioUrl} />
            </audio>
          </div>
        )}

        <div className="flex items-center gap-4 text-reddit-meta">
          <div className="flex items-center gap-1 hover:bg-reddit-hover px-2 py-1 rounded transition-colors">
            <MessageCircle size={16} />
            <span className="text-xs font-bold">
              {rant.commentsCount} Comments
            </span>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 hover:bg-reddit-hover px-2 py-1 rounded transition-colors group"
          >
            <Share2 size={16} className="group-hover:text-brand-500 transition-colors" />
            <span className="text-xs font-bold">Share</span>
          </button>
          <div className="badge">{rant.category}</div>
          {currentUser?.uid === rant.authorUid && (
            <button
              onClick={handleDelete}
              className="ml-auto p-1 text-reddit-meta hover:text-red-500 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// --- Pages ---

const CommunitySidebar = ({ user, groups, onOpenAuth }: { user: FirebaseUser | null, groups: Group[], onOpenAuth: () => void }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <div className="space-y-4">
      <div className="reddit-card overflow-hidden">
        <div className="h-10 bg-brand-500 flex items-center px-4">
          <span className="text-white font-bold text-xs uppercase tracking-widest">Top Communities</span>
        </div>
        <div className="p-2">
          {groups.slice(0, 5).map((group, i) => (
            <Link 
              key={group.id} 
              to={`/g/${group.id}`}
              className="flex items-center gap-3 p-2 hover:bg-reddit-hover rounded transition-colors group"
            >
              <span className="text-xs font-bold text-reddit-text w-4">{i + 1}</span>
              <div className="w-8 h-8 bg-brand-500/10 rounded flex items-center justify-center text-brand-500 font-bold text-sm group-hover:bg-brand-500 group-hover:text-white transition-colors">
                {group.displayName[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-reddit-text truncate">p/{group.name}</p>
                <p className="text-[10px] text-reddit-meta uppercase tracking-tight">{group.rantsCount || 0} Posts</p>
              </div>
            </Link>
          ))}
          <Link to="/groups" className="block text-center py-2 mt-2 text-xs font-bold text-brand-500 hover:bg-brand-500/10 rounded transition-colors">
            View All
          </Link>
        </div>
      </div>

      <div className="reddit-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-brand-500/20 rounded-lg flex items-center justify-center text-brand-500">
            <ChefHat size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-reddit-text">AI Criticism</h4>
            <p className="text-[10px] text-reddit-meta uppercase tracking-widest leading-none">Powered by Gemini</p>
          </div>
        </div>
        <p className="text-xs text-reddit-meta mb-0 leading-relaxed">
          Chef Pepperoni uses advanced spicy intelligence to Critique every rant. Bake your rants and get a real signature critique from the Head Chef himself.
        </p>
      </div>

      <div className="reddit-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-spicy-gold/20 rounded-lg flex items-center justify-center text-spicy-gold">
            <LayoutGrid size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-reddit-text">Your Spice</h4>
            <p className="text-[10px] text-reddit-meta uppercase tracking-widest leading-none">Personal communities</p>
          </div>
        </div>
        <p className="text-xs text-reddit-meta mb-4 leading-relaxed">
          The front page of your personal frustrations. {user?.isAnonymous ? "Register to start your own specific community." : "Create a community to rant about something specific."}
        </p>
        <button 
          onClick={user && !user.isAnonymous ? () => setIsModalOpen(true) : onOpenAuth}
          className="btn-primary w-full justify-center group"
        >
          {user?.isAnonymous ? (
            <>
              <ChefHat size={16} />
              <span>Register to Create</span>
            </>
          ) : (
            <>
              <Plus size={16} className="group-hover:rotate-90 transition-transform" />
              <span>Create Community</span>
            </>
          )}
        </button>
      </div>

      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
      />
    </div>
  );
};

const PostPage = ({
  user,
  onOpenAuth,
}: {
  user: FirebaseUser | null;
  onOpenAuth: () => void;
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-black text-white tracking-tighter italic uppercase">
          Preheat The Oven
        </h2>
        <p className="text-reddit-meta text-sm mt-1">
          Share your spicy take with the world.
        </p>
      </div>

      {user ? (
        <RantForm user={user} />
      ) : (
        <div className="reddit-card p-12 text-center">
          <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-500">
            <UserIcon size={32} />
          </div>
          <h3 className="text-xl font-bold text-reddit-text mb-2">
            Who are you?
          </h3>
          <p className="text-reddit-meta text-sm mb-8 max-w-sm mx-auto">
            You need to be signed in to start baking your rants.
          </p>
          <button onClick={onOpenAuth} className="btn-primary mx-auto">
            <ChefHat size={18} />
            <span>Identify Yourself</span>
          </button>
        </div>
      )}
    </div>
  );
};

const HomePage = ({
  user,
  onOpenAuth,
}: {
  user: FirebaseUser | null;
  onOpenAuth: () => void;
}) => {
  const navigate = useNavigate();
  const [rants, setRants] = useState<Rant[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState<string>("all");
  const [intensityFilter, setIntensityFilter] = useState<number>(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const rantsQ = query(collection(db, "rants"), orderBy("createdAt", "desc"));
    const unsubRants = onSnapshot(
      rantsQ,
      (snapshot) => {
        const rantsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Rant[];
        setRants(rantsData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "rants");
        setLoading(false);
      },
    );

    const groupsQ = query(collection(db, "groups"), orderBy("rantsCount", "desc"), limit(5));
    const unsubGroups = onSnapshot(groupsQ, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Group));
    });

    return () => {
      unsubRants();
      unsubGroups();
    };
  }, []);

  const filteredRants = useMemo(() => {
    return rants.filter((r) => {
      const matchesCategory =
        categoryFilter === "all" || r.category === categoryFilter;
      const matchesSearch =
        r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.authorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMood = moodFilter === "all" || r.mood === moodFilter;
      const matchesIntensity = r.intensity >= intensityFilter;

      return (
        matchesCategory && matchesSearch && matchesMood && matchesIntensity
      );
    });
  }, [rants, categoryFilter, searchQuery, moodFilter, intensityFilter]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Feed */}
        <div className="flex-1 lg:max-w-2xl">
          {user ? (
            <RantForm user={user} />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="reddit-card mb-4 relative overflow-hidden group min-h-[300px] flex items-center justify-center border-none"
            >
              {/* Branded Background Image */}
              <div className="absolute inset-0 z-0">
                <img
                  src="https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&q=80&w=1200"
                  alt="Pepperoni Texture"
                  className="w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-1000"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-reddit-card via-reddit-card/80 to-transparent" />
              </div>

              <div className="relative z-10 p-8 text-center max-w-lg">
                <motion.div 
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  className="w-20 h-20 bg-brand-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-500/40 relative group-hover:rotate-12 transition-transform duration-500"
                >
                  <Pizza className="text-white fill-white/20" size={40} />
                  {/* Custom 'Spicy' Sparkles */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-spicy-gold rounded-full flex items-center justify-center text-[10px] shadow-lg animate-bounce">
                    🔥
                  </div>
                </motion.div>

                <h1 className="text-4xl font-display font-black text-white mb-3 tracking-tighter italic">
                  PEPPERONI
                </h1>
                <p className="text-reddit-text/80 mb-8 text-sm leading-relaxed font-medium">
                  The hottest place for your coldest takes. Share the spice, 
                  join the oven, and let your frustrations bake to perfection.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={onOpenAuth}
                    className="btn-primary w-full sm:w-auto px-10 py-4 text-base"
                  >
                    <ChefHat size={20} />
                    <span>Get Into The Oven</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          <div className="space-y-4 mb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h2 className="text-lg font-display font-bold text-reddit-text flex items-center gap-2">
                <TrendingUp className="text-brand-500" size={20} />
                Trending Hot
              </h2>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-48">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-reddit-meta"
                    size={14}
                  />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full reddit-input pl-8 py-1.5 text-xs"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "p-1.5 rounded border transition-all",
                    showFilters
                      ? "bg-brand-500/20 border-brand-500 text-brand-500"
                      : "bg-reddit-card border-reddit-border text-reddit-meta hover:bg-reddit-hover",
                  )}
                >
                  <Filter size={16} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="reddit-card p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest">
                        Category
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full bg-reddit-hover border border-reddit-border rounded px-2 py-1.5 text-[10px] font-bold text-reddit-meta uppercase tracking-widest focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="all" className="bg-reddit-card">
                          All Categories
                        </option>
                        {CATEGORIES.map((cat) => (
                          <option
                            key={cat}
                            value={cat}
                            className="bg-reddit-card"
                          >
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest">
                        Mood
                      </label>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => setMoodFilter("all")}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold transition-all",
                            moodFilter === "all"
                              ? "bg-brand-500 text-white"
                              : "bg-reddit-hover text-reddit-meta hover:border-reddit-meta border border-transparent",
                          )}
                        >
                          All
                        </button>
                        {MOODS.map((m) => (
                          <button
                            key={m}
                            onClick={() => setMoodFilter(m)}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-base transition-all",
                              moodFilter === m
                                ? "bg-brand-500/20 border-brand-500 border"
                                : "bg-reddit-hover hover:border-reddit-meta border border-transparent",
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest">
                          Min Heat
                        </label>
                        <span className="text-[10px] font-bold text-brand-500">
                          {intensityFilter}+
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap size={12} className="text-brand-500" />
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={intensityFilter}
                          onChange={(e) =>
                            setIntensityFilter(parseInt(e.target.value))
                          }
                          className="accent-brand-500 w-full h-1 bg-reddit-border rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="reddit-card p-6 h-32 animate-pulse" />
                ))
              ) : filteredRants.length > 0 ? (
                filteredRants.map((rant) => (
                  <RantCard key={rant.id} rant={rant} currentUser={user} />
                ))
              ) : (
                <div className="text-center py-12 reddit-card border-dashed border-reddit-border">
                  <div className="w-12 h-12 bg-reddit-hover rounded-full flex items-center justify-center mx-auto mb-3 text-reddit-meta">
                    <AlertCircle size={24} />
                  </div>
                  <h3 className="text-base font-bold text-reddit-text">
                    No matches found
                  </h3>
                  <p className="text-reddit-meta text-xs">
                    Try adjusting your filters or search query.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-[312px]">
          <CommunitySidebar user={user} groups={groups} onOpenAuth={onOpenAuth} />
        </div>
      </div>
    </div>
  );
};

const RantDetailPage = ({
  user,
  onOpenAuth,
}: {
  user: FirebaseUser | null;
  onOpenAuth: () => void;
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rant, setRant] = useState<Rant | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribeRant = onSnapshot(doc(db, "rants", id), (doc) => {
      if (doc.exists()) {
        setRant({ id: doc.id, ...doc.data() } as Rant);
      } else {
        navigate("/");
      }
    });

    const q = query(
      collection(db, "rants", id, "comments"),
      orderBy("createdAt", "asc"),
    );
    const unsubscribeComments = onSnapshot(q, (snapshot) => {
      setComments(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Comment[],
      );
    });

    return () => {
      unsubscribeRant();
      unsubscribeComments();
    };
  }, [id, navigate]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commentText.trim() || isSubmitting || !id) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "rants", id, "comments"), {
        rantId: id,
        authorUid: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        content: commentText.trim(),
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "rants", id), { commentsCount: increment(1) });

      // Award points to the author (if not self)
      if (rant?.authorUid !== user.uid) {
        await updateDoc(doc(db, "users", rant!.authorUid), {
          supporterPoints: increment(2),
        });
      }

      setCommentText("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rants/${id}/comments`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!rant) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-reddit-meta hover:text-reddit-text mb-4 transition-colors group"
      >
        <ChevronLeft
          size={16}
          className="group-hover:-translate-x-1 transition-transform"
        />
        <span className="font-bold text-[10px] uppercase tracking-widest">
          Back
        </span>
      </button>

      <RantCard rant={rant} currentUser={user} />

      <div className="mt-8">
        <h3 className="text-sm font-display font-bold text-reddit-text mb-4 flex items-center gap-2">
          <MessageCircle className="text-brand-500" size={18} />
          Comments ({comments.length})
        </h3>

        {user ? (
          <form onSubmit={handleComment} className="flex gap-3 mb-8">
            <img
              src={user.photoURL || ""}
              className="w-8 h-8 rounded-full border border-reddit-border shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="relative flex-1">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="What are your thoughts?"
                className="reddit-input w-full pr-10 text-sm"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isSubmitting}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-500 hover:bg-reddit-hover rounded transition-all disabled:opacity-30"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        ) : (
          <div className="reddit-card p-4 text-center mb-8 border-dashed border-reddit-border">
            <p className="text-xs text-reddit-meta mb-3">
              Log in to join the conversation.
            </p>
            <button onClick={onOpenAuth} className="btn-primary inline-flex">
              Log In
            </button>
          </div>
        )}

        <div className="space-y-4">
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <img
                src={comment.authorPhoto || ""}
                className="w-6 h-6 rounded-full border border-reddit-border shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="reddit-card p-3 rounded-tl-none flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-reddit-text">
                    {comment.authorName}
                  </span>
                  <span className="text-[10px] font-mono text-reddit-meta uppercase tracking-widest">
                    {comment.createdAt
                      ? formatDistanceToNow(comment.createdAt.toDate(), {
                          addSuffix: true,
                        })
                      : "Just now"}
                  </span>
                </div>
                <p className="text-xs text-reddit-text leading-relaxed">
                  {comment.content}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const GroupsPage = ({ 
  user, 
  onOpenAuth 
}: { 
  user: FirebaseUser | null;
  onOpenAuth: () => void;
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "groups"), orderBy("rantsCount", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGroups(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Group),
      );
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-display font-bold text-reddit-text flex items-center gap-2">
            <LayoutGrid className="text-brand-500" size={24} />
            Browse Communities
          </h2>
          <p className="text-reddit-meta text-sm mt-1">
            Find your specific niche to rant in.
          </p>
        </div>
        <button 
          onClick={user && !user.isAnonymous ? () => setIsModalOpen(true) : onOpenAuth} 
          className="btn-primary"
        >
          {user?.isAnonymous ? (
            <>
              <ChefHat size={18} />
              <span>Register to Create</span>
            </>
          ) : (
            <>
              <Plus size={18} />
              <span>Create Community</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="reddit-card h-32 animate-pulse" />
          ))
        ) : groups.length > 0 ? (
          groups.map((group) => (
            <Link
              key={group.id}
              to={`/g/${group.id}`}
              className="reddit-card p-4 hover:border-brand-500/50 group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center text-brand-500 font-bold text-lg group-hover:bg-brand-500 group-hover:text-white transition-colors">
                  {group.displayName[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-reddit-text group-hover:text-brand-500 transition-colors">
                    p/{group.name}
                  </h3>
                  <p className="text-[10px] text-reddit-meta uppercase tracking-widest">
                    {group.rantsCount || 0} Members
                  </p>
                </div>
              </div>
              <p className="text-xs text-reddit-meta line-clamp-2 leading-relaxed">
                {group.description || "No description provided."}
              </p>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-20 text-center reddit-card border-dashed">
            <Users size={48} className="mx-auto text-reddit-border mb-4" />
            <h3 className="text-lg font-bold text-reddit-text">
              No communities yet
            </h3>
            <p className="text-reddit-meta text-sm">
              Be the first to create one!
            </p>
          </div>
        )}
      </div>

      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
      />
    </div>
  );
};

const CreateGroupModal = ({
  isOpen,
  onClose,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser | null;
}) => {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.isAnonymous) {
      setError("Only registered users can create communities.");
      return;
    }
    setLoading(true);
    setError("");

    const slug = name.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (slug.length < 3) {
      setError("Community name must be at least 3 characters.");
      setLoading(false);
      return;
    }

    try {
      // Check if name exists
      const q = query(collection(db, "groups"), where("name", "==", slug));
      const existing = await getDocs(q);
      if (!existing.empty) {
        setError("A community with this name already exists.");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "groups"), {
        name: slug,
        displayName,
        description,
        creatorUid: user.uid,
        createdAt: serverTimestamp(),
        membersCount: 1,
        rantsCount: 0,
      });

      onClose();
      setName("");
      setDisplayName("");
      setDescription("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg reddit-card bg-reddit-card p-6 md:p-8 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-reddit-meta hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-reddit-text">
            Create a Community
          </h2>
          <p className="text-reddit-meta text-sm mt-1">
            Found something specific you want to rant about consistently?
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest pl-1">
              Unique Name (slug)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-reddit-meta font-bold">
                p/
              </span>
              <input
                type="text"
                required
                placeholder="e.g. coffee_rants"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full reddit-input pl-8 h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest pl-1">
              Display Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Coffee Rants"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full reddit-input h-10 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest pl-1">
              Description (Optional)
            </label>
            <textarea
              placeholder="What is this community for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full reddit-input min-h-[100px] text-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-bold text-reddit-meta hover:text-reddit-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !user}
              className="btn-primary px-8"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Create Community"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const GroupFeedPage = ({ user }: { user: FirebaseUser | null }) => {
  const { groupId } = useParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [rants, setRants] = useState<Rant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;

    const fetchGroup = async () => {
      try {
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        if (groupDoc.exists()) {
          setGroup({ id: groupDoc.id, ...groupDoc.data() } as Group);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `groups/${groupId}`);
      }
    };

    const q = query(
      collection(db, "rants"),
      where("groupId", "==", groupId),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRants(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Rant),
      );
      setLoading(false);
    });

    fetchGroup();
    return () => unsubscribe();
  }, [groupId]);

  if (!group && !loading)
    return (
      <div className="text-center py-20 text-reddit-meta">
        Community not found.
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="reddit-card p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-16 bg-brand-500/10" />
        <div className="relative z-10 pt-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-brand-500 rounded-xl flex items-center justify-center text-white text-3xl font-bold shadow-xl">
              {group?.displayName[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-reddit-text">
                p/{group?.name}
              </h2>
              <p className="text-reddit-text font-medium">
                {group?.displayName}
              </p>
            </div>
          </div>
          <p className="text-reddit-meta text-sm leading-relaxed mb-6">
            {group?.description}
          </p>
          <div className="flex items-center gap-6 border-t border-reddit-border pt-4">
            <div>
              <div className="text-lg font-bold text-reddit-text">
                {group?.rantsCount || 0}
              </div>
              <div className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest">
                Spicy Posts
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-reddit-text">
                {group?.membersCount || 1}
              </div>
              <div className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest">
                Members
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {rants.length > 0 ? (
          rants.map((rant) => (
            <RantCard key={rant.id} rant={rant} currentUser={user} />
          ))
        ) : (
          <div className="text-center py-20 reddit-card border-dashed">
            <p className="text-reddit-meta text-sm">
              No rants in this community yet. Be the first!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Admin Dashboard Components ---

const ReportButton = ({
  currentUser,
  contentId,
  contentType,
  targetUid,
}: {
  currentUser: FirebaseUser;
  contentId: string;
  contentType: "rant" | "comment";
  targetUid: string;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const reportId = `${currentUser.uid}_${contentId}`;
      await setDoc(doc(db, "reports", reportId), {
        id: reportId,
        reporterUid: currentUser.uid,
        targetUid,
        contentId,
        contentType,
        reason,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      alert("Report submitted. Our spicy moderators will review it soon.");
      setIsModalOpen(false);
      setReason("");
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `reports/${currentUser.uid}_${contentId}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className="p-1.5 text-reddit-meta hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
        title="Report content"
      >
        <AlertCircle size={16} />
      </button>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md reddit-card bg-reddit-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-reddit-text mb-4">
                Report Content
              </h3>
              <form onSubmit={handleReport} className="space-y-4">
                <textarea
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you reporting this? (e.g. Hate speech, Spam, Not spicy enough...)"
                  className="w-full reddit-input min-h-[120px] text-sm resize-none"
                />
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-reddit-meta"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                  >
                    {submitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const AdminDashboard = ({ user }: { user: FirebaseUser | null }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "reports" | "monetization" | "users" | "settings"
  >("reports");

  useEffect(() => {
    const reportQ = query(
      collection(db, "reports"),
      orderBy("createdAt", "desc"),
    );
    const unsubReports = onSnapshot(reportQ, (snapshot) => {
      setReports(snapshot.docs.map((doc) => ({ ...doc.data() }) as Report));
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        setSiteSettings(snap.data() as SiteSettings);
      }
      setLoading(false);
    });

    return () => {
      unsubReports();
      unsubSettings();
    };
  }, []);

  const handleResolveReport = async (
    report: Report,
    action: "dismiss" | "ban",
  ) => {
    try {
      const batch = writeBatch(db);

      if (action === "ban") {
        batch.update(doc(db, "users", report.targetUid), { isActive: false });
      }

      batch.update(doc(db, "reports", report.id), { status: "resolved" });
      await batch.commit();
      alert(
        action === "ban"
          ? "User deactivated and report resolved."
          : "Report dismissed.",
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${report.id}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-lg">
          <ChefHat size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-display font-bold text-reddit-text">
            Pepperoni Oven Controls
          </h2>
          <p className="text-reddit-meta text-sm">
            Secret panel for the Head Chef.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-8">
        {(["reports", "users", "monetization", "settings"] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-all",
                activeTab === tab
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                  : "text-reddit-meta hover:bg-reddit-hover",
              )}
            >
              {tab}
            </button>
          ),
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "reports" && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {loading ? (
              <div className="py-20 text-center animate-pulse text-reddit-meta">
                Checking logs...
              </div>
            ) : reports.length > 0 ? (
              reports.map((report) => (
                <div
                  key={report.id}
                  className={cn(
                    "reddit-card p-6 flex flex-col md:flex-row gap-6",
                    report.status === "resolved" && "opacity-50 grayscale",
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                          report.status === "pending"
                            ? "bg-brand-500/10 text-brand-500"
                            : "bg-reddit-border text-reddit-meta",
                        )}
                      >
                        {report.status}
                      </span>
                      <span className="text-reddit-meta text-xs">
                        • Report for {report.contentType}
                      </span>
                    </div>
                    <p className="text-reddit-text font-medium mb-4">
                      Reason: {report.reason}
                    </p>
                    <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-reddit-meta">
                      <span>Target UID: {report.targetUid}</span>
                      <span>Content ID: {report.contentId}</span>
                    </div>
                  </div>
                  {report.status === "pending" && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleResolveReport(report, "dismiss")}
                        className="px-4 py-2 rounded border border-reddit-border text-xs font-bold text-reddit-text hover:bg-reddit-hover"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleResolveReport(report, "ban")}
                        className="px-4 py-2 rounded bg-red-500 text-white text-xs font-bold hover:bg-red-600 shadow-lg shadow-red-500/20"
                      >
                        Deactivate User
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-20 text-center reddit-card border-dashed">
                <p className="text-reddit-meta">
                  No active reports. The kitchen is clean!
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "monetization" && (
          <motion.div
            key="monetization"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="reddit-card p-8 bg-gradient-to-br from-brand-500/10 to-transparent">
                <TrendingUp className="text-brand-500 mb-4" size={32} />
                <h3 className="text-xl font-bold text-reddit-text mb-2">
                  Spice Revenue Strategy
                </h3>
                <p className="text-reddit-meta text-sm mb-6 leading-relaxed">
                  The community is growing. Potential monetization pathways:
                </p>
                <ul className="space-y-3">
                  {[
                    "Spicy Emotes Pack",
                    "Verified Spicy Badge",
                    "Community Hosting Fees",
                  ].map((plan) => (
                    <li
                      key={plan}
                      className="flex items-center gap-3 text-sm text-reddit-text"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                      {plan}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="reddit-card p-8 flex flex-col justify-center items-center text-center">
                <div className="text-4xl font-display font-bold text-reddit-text mb-2">
                  $0.00
                </div>
                <p className="text-[10px] font-bold text-reddit-meta uppercase tracking-[0.2em]">
                  Current MRR (Mock)
                </p>
                <button className="btn-primary mt-6 w-full">
                  Enable Stripe Connect
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "users" && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="reddit-card p-8 text-center text-reddit-meta"
          >
            <p>Direct user management coming in Chef v2.0</p>
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <SettingsManager settings={siteSettings} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SettingsManager = ({ settings }: { settings: SiteSettings | null }) => {
  const [headerCode, setHeaderCode] = useState(settings?.headerCode || "");
  const [footerCode, setFooterCode] = useState(settings?.footerCode || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setHeaderCode(settings.headerCode || "");
      setFooterCode(settings.footerCode || "");
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(
        doc(db, "settings", "global"),
        {
          headerCode,
          footerCode,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      alert("Settings baked successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/global");
      alert("Failed to bake settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="reddit-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <Code className="text-brand-500" size={24} />
        <h3 className="text-xl font-bold text-reddit-text">Code Injection</h3>
      </div>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest pl-1">
            Header Code (e.g. Meta tags, Styles)
          </label>
          <textarea
            value={headerCode}
            onChange={(e) => setHeaderCode(e.target.value)}
            placeholder="<!-- Add code to be injected in the head/top -->"
            className="w-full reddit-input font-mono text-xs min-h-[150px] resize-y"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest pl-1">
            Footer Code (e.g. Analytics scripts)
          </label>
          <textarea
            value={footerCode}
            onChange={(e) => setFooterCode(e.target.value)}
            placeholder="<!-- Add code to be injected at the bottom -->"
            className="w-full reddit-input font-mono text-xs min-h-[150px] resize-y"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary min-w-[150px]"
          >
            {saving ? "Baking..." : "Save Site Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};

const ProfilePage = ({ user }: { user: FirebaseUser | null }) => {
  const { uid } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRants, setUserRants] = useState<Rant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      }
    };

    const q = query(collection(db, "rants"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rants = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Rant)
        .filter((r) => r.authorUid === uid);
      setUserRants(rants);
      setLoading(false);
    });

    fetchProfile();
    return () => unsubscribe();
  }, [uid]);

  if (loading)
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-reddit-meta font-mono text-[10px] tracking-widest uppercase animate-pulse">
        Loading profile...
      </div>
    );

  if (profile && profile.isActive === false) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="reddit-card p-12">
          <div className="w-20 h-20 bg-reddit-bg rounded-full flex items-center justify-center mx-auto mb-6 text-reddit-meta border border-reddit-border">
            <UserIcon size={40} />
          </div>
          <h2 className="text-2xl font-display font-bold text-reddit-text mb-2">
            Account Spicy-Quit
          </h2>
          <p className="text-reddit-meta">
            This user has left the Pepperoni oven. Their rants remain, but their
            presence is gone.
          </p>
          <Link to="/" className="btn-primary mt-8 inline-flex">
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="reddit-card p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-16 bg-brand-500/10" />

        <div className="relative z-10 pt-4 flex flex-col md:flex-row items-center md:items-end gap-4">
          <img
            src={
              profile?.photoURL ||
              `https://ui-avatars.com/api/?name=${profile?.displayName || "U"}&background=random`
            }
            className="w-20 h-20 rounded-full border-4 border-reddit-card shadow-xl object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-display font-bold text-reddit-text mb-1">
              {profile?.displayName}
            </h2>
            <p className="text-reddit-meta text-[10px] uppercase tracking-widest">
              Joined{" "}
              {profile?.createdAt
                ? profile.createdAt.toDate().toLocaleDateString()
                : "recently"}
            </p>
            {profile?.bio && (
              <p className="text-sm text-reddit-text mt-2 italic">
                "{profile.bio}"
              </p>
            )}
          </div>

          {user && user.uid === uid && (
            <div className="mt-4 md:mt-0">
              <EditProfileButton
                profile={profile!}
                onUpdate={(updated) => setProfile(updated)}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-reddit-border mt-6 pt-6">
          <div className="text-center">
            <div className="text-lg font-bold text-reddit-text">
              {userRants.length}
            </div>
            <div className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest">
              Posts
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-brand-500">
              {profile?.supporterPoints || 0}
            </div>
            <div className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest">
              Karma
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-reddit-text">
              {userRants.reduce((acc, curr) => acc + curr.likesCount, 0)}
            </div>
            <div className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest">
              Impact
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-sm font-display font-bold text-reddit-text mb-4 flex items-center gap-2">
        <Clock className="text-brand-500" size={18} />
        Post History
      </h3>
      <div className="space-y-3">
        {userRants.length > 0 ? (
          userRants.map((rant) => (
            <RantCard key={rant.id} rant={rant} currentUser={user} />
          ))
        ) : (
          <div className="text-center py-12 reddit-card border-dashed border-reddit-border">
            <p className="text-xs text-reddit-meta">
              No history found. This user is surprisingly calm.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const EditProfileButton = ({
  profile,
  onUpdate,
}: {
  profile: UserProfile;
  onUpdate: (p: UserProfile) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-[10px] font-bold text-reddit-meta hover:text-brand-500 py-1.5 px-3 rounded-full border border-reddit-border hover:border-brand-500/50 transition-all uppercase tracking-widest"
      >
        Edit Profile
      </button>

      {isOpen && (
        <EditProfileModal
          profile={profile}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
};

const EditProfileModal = ({
  profile,
  isOpen,
  onClose,
  onUpdate,
}: {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (p: UserProfile) => void;
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio || "");
  const [photoURL, setPhotoURL] = useState(profile.photoURL || "");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) {
      alert("Spicy profile pics must be under 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPhotoURL(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedProfile = {
        ...profile,
        displayName,
        bio,
        photoURL,
      };
      await updateDoc(doc(db, "users", profile.uid), {
        displayName,
        bio,
        photoURL,
      });
      // Also update Auth profile
      await updateUserProfile(displayName, photoURL);
      onUpdate(updatedProfile);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    
    setLoading(true);
    setDeleteError("");
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        isActive: false,
      });
      await removeUserAccount();
      await logout();
      window.location.href = "/";
    } catch (err: any) {
      if (err?.code === "auth/requires-recent-login") {
        setDeleteError("Please log out and log back in before deleting your account.");
      } else {
        console.error("Account deletion failed:", err);
        setDeleteError("There was an issue deleting your account. Please log out, log back in, and try again.");
      }
      setConfirmDelete(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg reddit-card bg-reddit-card p-6 md:p-8 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-reddit-meta hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-reddit-text mb-8">
          Edit Spicy Identity
        </h2>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <img
                src={
                  photoURL ||
                  `https://ui-avatars.com/api/?name=${displayName || "U"}&background=random`
                }
                className="w-24 h-24 rounded-full border-4 border-reddit-bg shadow-xl object-cover group-hover:brightness-50 transition-all"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white" size={24} />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                className="hidden"
                accept="image/*"
              />
            </div>
            <p className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest">
              Click to Change Portrait
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest pl-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full reddit-input h-10 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-reddit-meta uppercase tracking-widest pl-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell them why you're so spicy..."
              className="w-full reddit-input min-h-[100px] text-sm resize-none"
            />
          </div>

          <div className="pt-4 border-t border-reddit-border flex flex-col gap-4">
            {deleteError && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded text-xs">
                {deleteError}
              </div>
            )}
            {confirmDelete && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded flex flex-col gap-2">
                <p className="text-xs font-bold">Are you sure you want to delete your account?</p>
                <p className="text-xs">Your rants will remain, but your profile will be deactivated. This cannot be undone.</p>
                <div className="flex gap-2 justify-end mt-2">
                  <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-1 hover:underline">Cancel</button>
                  <button type="button" onClick={handleDeactivate} disabled={loading} className="text-xs bg-red-500 text-white px-3 py-1 rounded font-bold hover:bg-red-600">
                    {loading ? "Deleting..." : "Yes, Delete Account"}
                  </button>
                </div>
              </div>
            )}
            <div className={`flex items-center ${confirmDelete ? 'justify-end' : 'justify-between'}`}>
              {!confirmDelete && (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest"
                >
                  Delete Account
                </button>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-bold text-reddit-meta"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary min-w-[120px]"
                >
                  {loading && !confirmDelete ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        setSiteSettings(snap.data() as SiteSettings);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);

      if (firebaseUser) {
        // Sync user profile to Firestore
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        let profileData: any = null;
        if (!userSnap.exists()) {
          profileData = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.isAnonymous
              ? "Guest Pepper"
              : firebaseUser.displayName ||
                (firebaseUser.email
                  ? firebaseUser.email.split("@")[0]
                  : "Unknown Pepper"),
            photoURL: firebaseUser.isAnonymous
              ? null
              : firebaseUser.photoURL || null,
            isActive: true,
            isAdmin: firebaseUser.email === ADMIN_EMAIL,
            supporterPoints: 0,
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, profileData);
        } else {
          profileData = userSnap.data();

          let needsUpdate = false;
          const updates: any = {};

          if (profileData.supporterPoints === undefined) {
            updates.supporterPoints = 0;
            profileData.supporterPoints = 0;
            needsUpdate = true;
          }
          if (profileData.isActive === undefined) {
            updates.isActive = true;
            profileData.isActive = true;
            needsUpdate = true;
          }

          // Bootstrap admin status if email matches but isAdmin is false
          if (firebaseUser.email === ADMIN_EMAIL && !profileData.isAdmin) {
            updates.isAdmin = true;
            profileData.isAdmin = true;
            needsUpdate = true;
          }

          if (needsUpdate) {
            try {
              await updateDoc(userRef, updates);
            } catch (error) {
              handleFirestoreError(
                error,
                OperationType.UPDATE,
                `users/${firebaseUser.uid}`,
              );
            }
          }
        }
        setUserProfile(profileData as UserProfile);
      } else {
        setUserProfile(null);
      }
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("the client is offline")
        ) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-reddit-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            <Flame
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-500 animate-pulse"
              size={20}
            />
          </div>
          <p className="text-reddit-meta font-mono text-[10px] uppercase tracking-[0.3em]">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen relative">
        {/* Header Injection */}
        {siteSettings?.headerCode && (
          <div dangerouslySetInnerHTML={{ __html: siteSettings.headerCode }} />
        )}

        <div className="atmosphere" />
        <Navbar
          user={user}
          userProfile={userProfile}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        <main className="relative z-10">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  user={user}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
                />
              }
            />
            <Route
              path="/post"
              element={
                <PostPage
                  user={user}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
                />
              }
            />
            <Route
              path="/rant/:id"
              element={
                <RantDetailPage
                  user={user}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
                />
              }
            />
            <Route path="/profile/:uid" element={<ProfilePage user={user} />} />
            <Route path="/groups" element={<GroupsPage user={user} onOpenAuth={() => setIsAuthModalOpen(true)} />} />
            <Route path="/g/:groupId" element={<GroupFeedPage user={user} />} />
            <Route
              path="/secret-pepper-panel"
              element={
                userProfile?.isAdmin ? (
                  <AdminDashboard user={user} />
                ) : (
                  <div className="py-20 text-center text-reddit-meta">
                    Checking Chef credentials...
                  </div>
                )
              }
            />
          </Routes>
        </main>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />

        {/* Mobile FAB for posting */}
        {user && (
          <div className="fixed bottom-8 right-8 md:hidden z-50">
            <Link 
              to="/post"
              className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-2xl shadow-2xl shadow-brand-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
            >
              <Plus size={32} />
            </Link>
          </div>
        )}

        {/* Footer Injection */}
        {siteSettings?.footerCode && (
          <div dangerouslySetInnerHTML={{ __html: siteSettings.footerCode }} />
        )}
      </div>
    </Router>
  );
}
