export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  isActive?: boolean;
  isAdmin?: boolean;
  supporterPoints: number;
  createdAt: any;
}

export interface Report {
  id: string;
  reporterUid: string;
  targetUid: string;
  contentId: string;
  contentType: 'rant' | 'comment';
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: any;
}

export interface SiteSettings {
  headerCode?: string;
  footerCode?: string;
  updatedAt: any;
}

export interface Rant {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  category: 'Work' | 'Life' | 'Tech' | 'Traffic' | 'Politics' | 'Sport' | 'Music' | 'Fashion' | 'Other';
  mood?: string;
  isAnonymous?: boolean;
  intensity: number; // 1-10
  likesCount: number;
  commentsCount: number;
  createdAt: any;
  groupId?: string;
  groupName?: string;
  imageUrl?: string;
  audioUrl?: string;
  pepperoniResponse?: string;
}

export interface Group {
  id: string;
  name: string; // unique slug
  displayName: string;
  description?: string;
  creatorUid: string;
  createdAt: any;
  membersCount: number;
  rantsCount: number;
}

export interface Comment {
  id: string;
  rantId: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: any;
}

export interface Like {
  rantId: string;
  userUid: string;
  createdAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}
