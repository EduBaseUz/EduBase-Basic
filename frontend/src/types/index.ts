// Shared types mirroring backend DTOs.

export type Role = "admin" | "mentor" | "student" | "parent";
export type UserStatus = "active" | "inactive";

export type Gender = "male" | "female";
export type AvatarGender = "male" | "female" | "both";

export interface DefaultAvatar {
  id: string;
  url: string;
  key: string;
  gender: AvatarGender;
  createdAt: string;
}

export interface User {
  id: string;
  role: Role;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  fullName: string;
  phone: string;
  gender?: Gender;
  address?: string;
  avatarUrl?: string;
  mustChangePassword: boolean;
  status: UserStatus;
  noteCourseId?: string;
  birthDate?: string;
  documentType?: "passport" | "birth_certificate";
  documentSeries?: string;
  documentNumber?: string;
  specialization?: string;
  specializations?: string[];
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail {
  user: User;
  groups?: Group[];
  payouts?: Payout[];
  tuition?: TuitionLedger[];
  parent?: User;
  children?: User[];
}

export type OrgTxnKind = "income" | "expense";

export interface OrgTransaction {
  id: string;
  kind: OrgTxnKind;
  category?: string;
  amount: number;
  comment?: string;
  date: string;
  by: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyPrice {
  monthIndex: number;
  price: number;
}

export interface PriceEntry {
  startDate: string;
  endDate: string;
  price: number;
  mentorRate: number;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  durationMonths: number;
  monthlyPrices: MonthlyPrice[];
  priceEntries?: PriceEntry[];
  lessonsPerMonth: number;
  mentorRatePerStudent: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  days: string[];
  startTime: string;
  endTime: string;
  room?: string;
}

export interface Group {
  id: string;
  name: string;
  courseId: string;
  mentorIds: string[];
  studentLimit: number;
  schedule: Schedule;
  startDate: string;
  status: "active" | "finished" | "paused";
  createdAt: string;
  updatedAt: string;
}

export type EnrollmentOutcome =
  | ""
  | "passed"
  | "repeat"
  | "transferred"
  | "dropped";

export interface Enrollment {
  id: string;
  studentId: string;
  groupId: string;
  joinedAt: string;
  leftAt?: string;
  status: "active" | "left";
  outcome?: EnrollmentOutcome;
}

export interface GroupDetail {
  group: Group;
  course?: Course;
  mentors: User[];
  students: { user: User; enrollment: Enrollment }[];
}

export type AttendanceStatus = "present" | "late" | "excused" | "absent";

export type LessonKind = "main" | "extra";

export interface Lesson {
  id: string;
  groupId: string;
  conductedByMentorId: string;
  date: string;
  topic: string;
  kind?: LessonKind;
  monthIndex: number;
  studentLessonPrice: number;
  mentorRateSnapshot: number;
  status: "done" | "cancelled";
}

export interface Homework {
  id: string;
  lessonId: string;
  groupId: string;
  title: string;
  description?: string;
}

export interface Attendance {
  id: string;
  lessonId: string;
  studentId: string;
  groupId: string;
  status: AttendanceStatus;
  markedBy: string;
}

export type GradeType = "homework" | "participation";

export interface Grade {
  id: string;
  lessonId: string;
  studentId: string;
  groupId: string;
  type: GradeType;
  score: number;
  gradedBy: string;
}

export interface LessonRoster {
  lesson: Lesson;
  homework?: Homework | null;
  attendances: Attendance[];
  grades: Grade[];
}

export interface RatingRow {
  studentId: string;
  fullName: string;
  average: number;
  gradeCount: number;
  attendanceRatio: number;
  rank: number;
}

export type PayStatus = "pending" | "partial" | "paid";

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  comment?: string;
  by: string;
}

export interface TuitionLedger {
  id: string;
  studentId: string;
  groupId: string;
  period: string;
  totalDue: number;
  discount: number;
  transactions: Transaction[];
  status: PayStatus;
}

export interface Payout {
  id: string;
  mentorId: string;
  courseId?: string;
  period: string;
  earnedAmount: number;
  transactions: Transaction[];
  status: PayStatus;
}

export interface StudentLedger {
  ledger: TuitionLedger;
  student: User;
  groupName: string;
}

export interface MentorPayout {
  payout: Payout;
  mentor: User;
}

export interface BalanceRow {
  userId: string;
  fullName: string;
  role: "student" | "mentor";
  charged: number;
  paid: number;
  balance: number;
}

export interface DebtorsResponse {
  students: BalanceRow[];
  mentors: BalanceRow[];
}

export interface MonthlyPoint {
  month: string;
  income: number;
  expense: number;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  profit: number;
  monthly: MonthlyPoint[];
}

export interface AdminDashboard {
  students: number;
  mentors: number;
  courses: number;
  groups: number;
  lessons: number;
  finance: FinanceSummary;
}

export interface MentorDashboard {
  groups: number;
  lessons: number;
  students: number;
  earnedThisMonth: number;
  monthly: MonthlyPoint[];
}

export interface StudentDashboard {
  groups: number;
  attendanceRatio: number;
  lessons: number;
  gradeLetters: Record<string, number>;
}

// Student-facing academic rows (letters only).
export interface StudentAttendanceRow {
  lessonId: string;
  groupId: string;
  date: string;
  topic: string;
  status: AttendanceStatus;
}

export interface StudentGradeRow {
  lessonId: string;
  groupId: string;
  date: string;
  topic: string;
  letter: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
