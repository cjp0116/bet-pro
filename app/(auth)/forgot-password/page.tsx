"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "An error occurred. Please try again.")
        return
      }

      setIsSubmitted(true)
    } catch {
      console.error("[ForgotPassword] Error:", error)
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Check your email</CardTitle>
          <CardDescription className="text-muted-foreground">
            If an account exists with <span className="text-foreground font-medium">{email}</span>, we&apos;ve sent password reset instructions.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground text-center">
              Didn&apos;t receive the email? Check your spam folder or try again with a different email address.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full h-11"
            onClick={() => setIsSubmitted(false)}
          >
            Try a different email
          </Button>
        </CardContent>

        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold tracking-tight">Forgot your password?</CardTitle>
        <CardDescription className="text-muted-foreground">
          No worries! Enter your email and we&apos;ll send you reset instructions.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                className="pl-10 h-11"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError("")
                }}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send reset instructions"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </CardFooter>
    </Card>
  )
}

