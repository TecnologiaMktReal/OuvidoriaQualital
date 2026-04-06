import { useState, useEffect } from "react";
import { useSupabaseAuth } from "./useSupabaseAuth";
import { trpc } from "@/lib/trpc";

export interface UserProfile {
  id: number;
  openId: string;
  fullName: string;
  nickname: string | null;
  email: string;
  phone: string | null;
  departmentId: number | null;
  departmentName: string | null;
  profileTypeId: number;
  profileName: string;
  profileRole: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useAuth() {
  const { user: sbUser, loading: sbLoading, logout } = useSupabaseAuth();
  
  const { 
    data: profile, 
    isLoading: profileLoading,
    refetch: refetchProfile 
  } = trpc.auth.me.useQuery({ userId: sbUser?.id } as any, {
    enabled: !!sbUser,
    staleTime: 1000 * 30, // 30 segundos
  });

  // Se sbUser é null, não estamos autenticados, ignoramos o profile do cache
  const user = sbUser ? profile : null;
  const isVerified = sbUser ? !!profile?.isEmailVerified : false;
  
  const loading = sbLoading || (!!sbUser && profileLoading);
  const isAdmin = user?.profileRole === 'admin' || user?.profileRole === 'SuperAdmin';
  const isSuperAdmin = user?.profileRole === 'SuperAdmin';

  return {
    user,
    supabaseUser: sbUser,
    loading,
    isVerified,
    isAdmin,
    isSuperAdmin,
    logout,
    refetchProfile
  };
}



