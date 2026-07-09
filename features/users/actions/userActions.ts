"use server";

import { canDeactivateAccount, canManageStaff, hashPassword, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getStaffPermissionsForAcademy,
  normalizeStaffPermissionSet,
  staffPermissionDefinitions,
  staffPermissionsSettingKey,
} from "@/lib/staffPermissions";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const USER_ROLES = Object.values(UserRole) as UserRole[];

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function roleValue(value: string) {
  return USER_ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}

function checked(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

export async function createUserAction(formData: FormData) {
  const user = await requireUser();

  if (!canManageStaff(user.role)) {
    redirect("/users?error=permission");
  }

  const name = text(formData, "name");
  const loginId = text(formData, "loginId");
  const password = text(formData, "password");
  const role = roleValue(text(formData, "role")) ?? UserRole.ASSISTANT;

  if (!name || !loginId || !password) {
    redirect("/users?error=empty");
  }

  const existing = await prisma.user.findFirst({
    where: {
      academyId: user.academyId,
      loginId,
    },
    select: { id: true },
  });

  if (existing) {
    redirect("/users?error=duplicate");
  }

  await prisma.user.create({
    data: {
      academyId: user.academyId,
      name,
      loginId,
      passwordHash: hashPassword(password),
      role,
    },
  });

  revalidatePath("/users");
  revalidatePath("/staff");
  redirect("/users");
}

export async function deleteUserAction(formData: FormData) {
  const user = await requireUser();

  if (!canDeactivateAccount(user.role)) {
    redirect("/users?error=permission");
  }

  const id = text(formData, "userId");

  if (!id) {
    redirect("/users?error=missing");
  }

  if (id === user.id) {
    redirect("/users?error=self");
  }

  const target = await prisma.user.findFirst({
    where: {
      id,
      academyId: user.academyId,
    },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!target || !target.isActive) {
    redirect("/users?error=missing");
  }

  if (target.role === UserRole.ADMIN) {
    const activeAdminCount = await prisma.user.count({
      where: {
        academyId: user.academyId,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    if (activeAdminCount <= 1) {
      redirect("/users?error=last-admin");
    }
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { isActive: false },
  });

  revalidatePath("/users");
  revalidatePath("/staff");
  redirect("/users");
}

export async function activateUserAction(formData: FormData) {
  const user = await requireUser();

  if (!canDeactivateAccount(user.role)) {
    redirect("/users?error=permission");
  }

  const id = text(formData, "userId");

  if (!id) {
    redirect("/users?error=missing");
  }

  const target = await prisma.user.findFirst({
    where: {
      id,
      academyId: user.academyId,
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!target || target.isActive) {
    redirect("/users?error=missing");
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { isActive: true },
  });

  revalidatePath("/users");
  revalidatePath("/staff");
  redirect("/users");
}

export async function updateUserPermissionsAction(formData: FormData) {
  const user = await requireUser();

  if (!canManageStaff(user.role)) {
    redirect("/users?error=permission");
  }

  const id = text(formData, "userId");
  if (!id) {
    redirect("/users?error=missing");
  }

  const target = await prisma.user.findFirst({
    where: { id, academyId: user.academyId },
    select: { id: true, role: true },
  });

  if (!target || target.role !== UserRole.ASSISTANT) {
    redirect("/users?error=missing");
  }

  const permissions = await getStaffPermissionsForAcademy(user.academyId);
  const nextSet = normalizeStaffPermissionSet(
    Object.fromEntries(staffPermissionDefinitions.map((permission) => [permission.key, checked(formData, permission.key)]))
  );

  if (staffPermissionDefinitions.some((permission) => nextSet[permission.key])) {
    permissions[target.id] = nextSet;
  } else {
    delete permissions[target.id];
  }

  await prisma.academySetting.upsert({
    where: { academyId_key: { academyId: user.academyId, key: staffPermissionsSettingKey } },
    create: {
      academyId: user.academyId,
      key: staffPermissionsSettingKey,
      value: JSON.stringify(permissions),
    },
    update: { value: JSON.stringify(permissions) },
  });

  revalidatePath("/users");
  revalidatePath("/staff");
  revalidatePath("/messages");
  revalidatePath("/omr");
  redirect("/users");
}
