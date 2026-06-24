"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
        >
          <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
          <div>
            <p className="font-semibold">일시적인 오류가 발생했습니다</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {this.state.message ?? "페이지를 새로고침해 주세요."}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => this.setState({ hasError: false })}
          >
            다시 시도
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
