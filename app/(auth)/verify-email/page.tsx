"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"verifying" | "success" | "error" | "expired">("verifying")
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!token) {
      setStatus("error")
      return
    }

    const verifyEmail = async () => {
      try {
        // TODO: Implement actual verification logic
        // const response = await fetch(`/api/auth/verify-email?token=${token}`)
        // const data = await response.json()

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Simulate success (in real implementation, check response)
        setStatus("success")
      } catch (err) {
        setStatus("error")
      }
    }

    verifyEmail()
  }, [token])

  // Countdown for redirect after success
  useEffect(() => {
    if (status === "success" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
    if (status === "success" && countdown === 0) {
      router.push("/login")
    }
  }, [status, countdown, router])

  if (status === "verifying") {
    return (
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Verifying your email</CardTitle>
          <CardDescription className="text-muted-foreground">
            Please wait while we verify your email address...
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (status === "success") {
    return (
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Email verified!</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your email has been successfully verified. You can now sign in to your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <p className="text-sm text-muted-foreground">
              Redirecting to login in <span className="text-primary font-bold">{countdown}</span> seconds...
            </p>
          </div>

          <Button
            className="w-full h-11 font-semibold"
            onClick={() => router.push("/login")}
          >
            Sign in now
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (status === "expired") {
    return (
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-accent" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Link expired</CardTitle>
          <CardDescription className="text-muted-foreground">
            This verification link has expired. Please request a new verification email.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button
            className="w-full h-11 font-semibold"
            onClick={() => router.push("/signup")}
          >
            Request new verification email
          </Button>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already verified?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    )
  }

  // Error state
  return (
    <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Verification failed</CardTitle>
        <CardDescription className="text-muted-foreground">
          We couldn&apos;t verify your email address. The link may be invalid or expired.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Button
          className="w-full h-11 font-semibold"
          onClick={() => router.push("/signup")}
        >
          Try signing up again
        </Button>

        <Button
          variant="outline"
          className="w-full h-11"
          onClick={() => router.push("/login")}
        >
          Back to login
        </Button>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground text-center">
          Need help?{" "}
          <Link
            href="/support"
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Contact support
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Loading...</CardTitle>
          </CardHeader>
        </Card>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}

