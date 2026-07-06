import { requireUser } from "@/lib/auth";
import { getStudentSheetCustomSettings, getStudentSheetOptionSettings } from "@/lib/academySettings";
import { classGroupWhereForUser, effectiveClassStatus } from "@/lib/classGroups";
import { todayKoreaDate } from "@/lib/date";
import { ClassGroupStatus, EnrollmentStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { studentWhereForUser } from "@/lib/scopes";
import { filterStudentActivityForClassSchedule } from "@/lib/classGroupStats";
import type { StudentSheetRow } from "@/features/students/components/StudentSheetMatrix";
import type { ClassTestExamOption, LessonClassGroupOption } from "@/features/students/lib/studentLessonSpreadsheetTypes";

export type StudentsPageSearchParams = {
  date?: string;
  classGroupId?: string;
  classGroupIds?: string;
  testId?: string;
};

export const ALL_TESTS_OPTION_ID = "all-tests";

export async function loadStudentsPageData(searchParams?: StudentsPageSearchParams) {
  const user = await requireUser();
  const sp = searchParams ?? {};
  const date = isDate(sp.date) ? String(sp.date) : todayKoreaDate();
  const requestedClassGroupId = cleanFilter(sp.classGroupId);
  const requestedClassGroupIds = cleanFilterList(sp.classGroupIds);
  const requestedTestId = cleanFilter(sp.testId);
  const explicitAllClasses = sp.classGroupId === "all";

  const [classGroups, optionSettings, customSettings, uploadStudents] = await Promise.all([
    prisma.classGroup.findMany({
      where: classGroupWhereForUser(user),
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: {
        teacher: { select: { id: true, name: true } },
        lessons: {
          orderBy: { position: "asc" },
          select: { id: true, position: true, title: true, lessonDate: true, startTime: true, endTime: true, memo: true },
        },
      },
    }),
    getStudentSheetOptionSettings(user.academyId),
    getStudentSheetCustomSettings(user.academyId),
    prisma.student.findMany({
      where: studentWhereForUser(user),
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, phone: true, parentPhone: true },
    }),
  ]);

  const classGroupOptions: LessonClassGroupOption[] = classGroups.map((classGroup) => ({
    id: classGroup.id,
    name: classGroup.name,
    status: classGroup.status,
    effectiveStatus: effectiveClassStatus(classGroup),
    subject: classGroup.subject,
    grade: classGroup.grade,
    teacherName: classGroup.teacher?.name ?? "",
    startDate: classGroup.startDate,
    endDate: classGroup.endDate,
    daysOfWeek: classGroup.daysOfWeek,
    startTime: classGroup.startTime,
    endTime: classGroup.endTime,
    schedule: classGroup.schedule,
    lessons: classGroup.lessons,
  }));
  const fallbackClassGroupId =
    classGroupOptions.find((classGroup) => classGroup.effectiveStatus !== ClassGroupStatus.ENDED && (classGroup.startDate || classGroup.daysOfWeek || classGroup.schedule))?.id ??
    classGroupOptions.find((classGroup) => classGroup.effectiveStatus !== ClassGroupStatus.ENDED)?.id ??
    classGroupOptions[0]?.id ??
    null;
  const classGroupOptionIds = new Set(classGroupOptions.map((classGroup) => classGroup.id));
  const requestedValidClassGroupIds = requestedClassGroupIds.filter((id) => classGroupOptionIds.has(id));
  const singleRequestedClassGroupId = requestedClassGroupId && classGroupOptionIds.has(requestedClassGroupId) ? requestedClassGroupId : null;
  const effectiveClassGroupIds =
    requestedValidClassGroupIds.length > 0
      ? requestedValidClassGroupIds
      : singleRequestedClassGroupId
        ? [singleRequestedClassGroupId]
        : explicitAllClasses
          ? []
          : fallbackClassGroupId
            ? [fallbackClassGroupId]
            : [];
  const effectiveClassGroupId = effectiveClassGroupIds.length === 1 ? effectiveClassGroupIds[0] : null;

  const classTestOptions = effectiveClassGroupId
    ? await prisma.classTest.findMany({
        where: { academyId: user.academyId, classGroupId: effectiveClassGroupId, active: true },
        orderBy: [{ type: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          classGroupId: true,
          name: true,
          type: true,
          subject: true,
          totalScore: true,
          questionCount: true,
          classLessonId: true,
          lessonPosition: true,
          templateType: true,
          active: true,
          exams: {
            orderBy: [{ lessonPosition: "asc" }, { examDate: "asc" }, { createdAt: "desc" }],
            select: { id: true, classLessonId: true, lessonPosition: true, title: true, examDate: true, totalScore: true, questionCount: true },
          },
        },
      })
    : [];

  const selectedClassGroupOption = classGroupOptions.find((classGroup) => classGroup.id === effectiveClassGroupId) ?? null;
  const lessonLabelById = new Map((selectedClassGroupOption?.lessons ?? []).map((lesson) => [lesson.id, lesson.position]));

  const testOptions: ClassTestExamOption[] = classTestOptions.map((classTest) => {
    const singleLessonPosition = classTest.lessonPosition ?? (classTest.classLessonId ? lessonLabelById.get(classTest.classLessonId) ?? null : null);
    const displayName = classTest.type === "SINGLE" && singleLessonPosition ? `${singleLessonPosition}차시 ${classTest.name}` : classTest.name;
    return {
      id: classTest.id,
      classGroupId: classTest.classGroupId,
      classTestId: classTest.id,
      classLessonId: classTest.classLessonId,
      lessonPosition: classTest.lessonPosition,
      type: classTest.type,
      name: classTest.name,
      displayName,
      subject: classTest.subject,
      totalScore: classTest.totalScore,
      questionCount: classTest.questionCount,
      templateType: classTest.templateType,
      active: classTest.active,
      exams: classTest.exams,
    };
  });

  const requestedAllTests = requestedTestId === ALL_TESTS_OPTION_ID;
  const selectedTestExamId = requestedAllTests && testOptions.length > 0
    ? ALL_TESTS_OPTION_ID
    : requestedTestId && testOptions.some((test) => test.id === requestedTestId)
      ? requestedTestId
      : testOptions.length === 1
        ? testOptions[0].id
        : testOptions.length > 1
          ? ALL_TESTS_OPTION_ID
          : null;
  const selectedTestOption = selectedTestExamId && selectedTestExamId !== ALL_TESTS_OPTION_ID ? testOptions.find((test) => test.id === selectedTestExamId) ?? null : null;

  const filters: Prisma.StudentWhereInput[] = [];
  if (effectiveClassGroupIds.length > 0) {
    const selectedOperatingClassGroupIds = effectiveClassGroupIds.filter((id) => {
      const option = classGroupOptions.find((classGroup) => classGroup.id === id);
      return option?.effectiveStatus !== ClassGroupStatus.ENDED;
    });
    const selectedEndedClassGroupIds = effectiveClassGroupIds.filter((id) => {
      const option = classGroupOptions.find((classGroup) => classGroup.id === id);
      return option?.effectiveStatus === ClassGroupStatus.ENDED;
    });
    const membershipFilters: Prisma.StudentClassWhereInput[] = [];
    if (selectedOperatingClassGroupIds.length > 0) {
      membershipFilters.push({ classGroupId: { in: selectedOperatingClassGroupIds }, status: EnrollmentStatus.ACTIVE });
    }
    if (selectedEndedClassGroupIds.length > 0) {
      membershipFilters.push({ classGroupId: { in: selectedEndedClassGroupIds } });
    }
    filters.push({
      studentClasses: {
        some: membershipFilters.length === 1 ? membershipFilters[0] : { OR: membershipFilters },
      },
    });
  }

  const students = await prisma.student.findMany({
    where: { AND: [studentWhereForUser(user), ...filters] },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    include: {
      attendanceRecords: { orderBy: { date: "desc" }, select: { date: true, status: true } },
      assignmentRecords: { orderBy: [{ date: "desc" }, { updatedAt: "desc" }], select: { date: true, status: true, score: true, title: true } },
      scoreRecords: { orderBy: [{ date: "desc" }, { updatedAt: "desc" }], select: { date: true, title: true, score: true, maxScore: true } },
      studentClasses: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        select: {
          classGroupId: true,
          status: true,
          isPrimary: true,
          joinedAt: true,
          leftAt: true,
          createdAt: true,
          classGroup: { select: { id: true, name: true, status: true, startDate: true, endDate: true, daysOfWeek: true } },
        },
      },
    },
  });

  const selectedTestIds = selectedTestExamId === ALL_TESTS_OPTION_ID
    ? testOptions.map((test) => test.id)
    : selectedTestExamId
      ? [selectedTestExamId]
      : [];
  const selectedTestScores = selectedTestIds.length > 0
    ? await prisma.studentTestScore.findMany({
        where: { academyId: user.academyId, classTestId: { in: selectedTestIds }, studentId: { in: students.map((student) => student.id) } },
        select: { studentId: true, examId: true, score: true },
      })
    : [];
  const selectedTestScoreByStudentId = new Map<string, Record<string, string>>();
  const firstSelectedScoreByStudentId = new Map<string, number | null>();
  for (const score of selectedTestScores) {
    const current = selectedTestScoreByStudentId.get(score.studentId) ?? {};
    if (score.score !== null && score.score !== undefined) current[score.examId] = String(score.score);
    selectedTestScoreByStudentId.set(score.studentId, current);
    if (!firstSelectedScoreByStudentId.has(score.studentId)) firstSelectedScoreByStudentId.set(score.studentId, score.score);
  }

  const rows: StudentSheetRow[] = students.map((student, index) => {
    const selectedClassGroupIdSet = new Set(effectiveClassGroupIds);
    const selectedClass = effectiveClassGroupId ? student.studentClasses.find((membership) => membership.classGroupId === effectiveClassGroupId) : null;
    const activeOperatingClasses = student.studentClasses.filter(
      (membership) => membership.status === EnrollmentStatus.ACTIVE && effectiveClassStatus(membership.classGroup) !== ClassGroupStatus.ENDED
    );
    const selectedMemberships =
      effectiveClassGroupIds.length > 1
        ? student.studentClasses.filter((membership) => {
            if (!selectedClassGroupIdSet.has(membership.classGroupId)) return false;
            const isEnded = effectiveClassStatus(membership.classGroup) === ClassGroupStatus.ENDED;
            return isEnded || membership.status === EnrollmentStatus.ACTIVE;
          })
        : [];
    const displayMemberships = selectedClass ? [selectedClass] : selectedMemberships.length > 0 ? selectedMemberships : activeOperatingClasses;
    const primaryClass = selectedClass ?? selectedMemberships.find((membership) => membership.isPrimary) ?? selectedMemberships[0] ?? activeOperatingClasses.find((membership) => membership.isPrimary) ?? activeOperatingClasses[0] ?? student.studentClasses.find((membership) => membership.isPrimary) ?? student.studentClasses[0];
    const classGroupName = selectedClass
      ? selectedClass.classGroup?.name ?? ""
      : summarizeClassGroups(displayMemberships.map((membership) => membership.classGroup?.name).filter((name): name is string => Boolean(name)));
    const scopedActivity = scopedStudentActivity(student, displayMemberships);
    const attendance = scopedActivity.attendanceRecords.find((record) => record.date === date);
    const assignment = scopedActivity.assignmentRecords.find((record) => record.date === date);
    const legacyScore = scopedActivity.scoreRecords.find((record) => record.date === date);
    const selectedTestScoreMap = selectedTestScoreByStudentId.get(student.id) ?? {};
    const selectedTestScore = firstSelectedScoreByStudentId.get(student.id);
    const attendanceStatus = attendance?.status ?? "";
    const assignmentStatus = assignment?.status ?? "";

    return {
      id: student.id,
      no: index + 1,
      name: student.name,
      phone: student.phone ?? "",
      parentPhone: student.parentPhone ?? "",
      schoolName: student.schoolName ?? "",
      grade: student.grade ?? "",
      classGroupId: primaryClass?.classGroupId ?? "",
      classGroupIds: displayMemberships.map((membership) => membership.classGroupId),
      classGroupName,
      subject: student.subject ?? "",
      currentLevel: student.currentLevel ?? "",
      memo: student.memo ?? "",
      attendance: sheetOptionLabel(optionSettings.attendanceOptions, attendanceStatus),
      assignment: sheetOptionLabel(optionSettings.assignmentOptions, assignmentStatus),
      assignmentScore: assignment?.score ?? null,
      score: selectedTestScore ?? legacyScore?.score ?? null,
      maxScore: selectedTestOption?.totalScore ?? legacyScore?.maxScore ?? 100,
      attendanceByDate: Object.fromEntries(
        scopedActivity.attendanceRecords.map((record) => [record.date, sheetOptionLabel(optionSettings.attendanceOptions, record.status)])
      ),
      assignmentByDate: Object.fromEntries(
        scopedActivity.assignmentRecords.map((record) => [record.date, sheetOptionLabel(optionSettings.assignmentOptions, record.status)])
      ),
      scoreByDate: Object.fromEntries(
        scopedActivity.scoreRecords
          .filter((record) => record.score !== null)
          .map((record) => [record.date, String(record.score ?? "")])
      ),
      testScoreByExamId: selectedTestScoreMap,
      customValues: customSettings.customValues[student.id] ?? {},
    };
  });

  return {
    classGroupOptions,
    effectiveClassGroupId,
    effectiveClassGroupIds,
    rows,
    customColumns: customSettings.customColumns,
    uploadStudents: uploadStudents.map((student) => ({
      id: student.id,
      name: student.name,
      phone: student.phone ?? "",
      parentPhone: student.parentPhone ?? "",
    })),
    testOptions,
    selectedTestExamId,
    canUploadStudents: user.role === "ADMIN" || user.role === "MANAGER" || user.role === "TEACHER",
  };
}

function isDate(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function cleanFilter(value?: string) {
  if (!value || value === "none" || value === "-" || value === "all") return null;
  return /^[A-Za-z0-9_-]{1,80}$/.test(value) ? value : null;
}

function cleanFilterList(value?: string) {
  if (!value) return [];
  return Array.from(new Set(value.split(",").map((item) => cleanFilter(item)).filter((item): item is string => Boolean(item))));
}

function sheetOptionLabel(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function summarizeClassGroups(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names[0]} 외 ${names.length - 1}`;
}

function scopedStudentActivity<
  T extends {
    scoreRecords: Array<{ date: string; title: string; score: number | null; maxScore?: number | null }>;
    attendanceRecords: Array<{ date: string; status: string }>;
    assignmentRecords: Array<{ date: string; status: string; score?: number | null; title?: string }>;
  },
  M extends {
    joinedAt: string | null;
    leftAt: string | null;
    classGroup?: { startDate: string | null; endDate: string | null; daysOfWeek?: string | null } | null;
  },
>(student: T, memberships: M[]) {
  if (memberships.length === 0) return student;

  const scoreRecords = new Map<string, T["scoreRecords"][number]>();
  const attendanceRecords = new Map<string, T["attendanceRecords"][number]>();
  const assignmentRecords = new Map<string, T["assignmentRecords"][number]>();

  for (const membership of memberships) {
    if (!membership.classGroup) continue;
    const filtered = filterStudentActivityForClassSchedule(student, membership.classGroup, membership);
    for (const record of filtered.scoreRecords) scoreRecords.set(`${record.date}:${record.title}`, record);
    for (const record of filtered.attendanceRecords) attendanceRecords.set(record.date, record);
    for (const record of filtered.assignmentRecords) assignmentRecords.set(`${record.date}:${record.title ?? ""}`, record);
  }

  return {
    ...student,
    scoreRecords: [...scoreRecords.values()],
    attendanceRecords: [...attendanceRecords.values()],
    assignmentRecords: [...assignmentRecords.values()],
  };
}
