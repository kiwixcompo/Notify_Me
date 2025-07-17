import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthForm from '../components/AuthForm';

export default function Register() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        router.replace('/dashboard');
      }
    }
  }, [router]);
  return (
    <AuthForm mode="register" />
  );
} 