"use client";

import {
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  type HTMLMotionProps,
} from "motion/react";
import {
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { getMotionRevealDelaySeconds } from "@/lib/motion-reveal-timing";

const DEFAULT_MAX_HYDRATION_DELAY = 1200;
type MotionRevealTransition = Omit<
  NonNullable<HTMLMotionProps<"div">["transition"]>,
  "delay"
>;

export type MotionRevealProps = Omit<
  HTMLMotionProps<"div">,
  "animate" | "children" | "initial" | "transition" | "viewport" | "whileInView"
> & {
  children?: ReactNode;
  delayMs?: number;
  maxHydrationDelay?: number;
  offset?: number;
  scale?: number;
  skipLateHydration?: boolean;
  transition?: MotionRevealTransition;
  viewport?: HTMLMotionProps<"div">["viewport"];
};

export function MotionReveal({
  children,
  delayMs = 0,
  maxHydrationDelay = DEFAULT_MAX_HYDRATION_DELAY,
  offset = 16,
  scale = 0.98,
  skipLateHydration = true,
  transition,
  viewport = { once: true, amount: 0.2 },
  ...props
}: MotionRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = useShouldAnimate({
    maxHydrationDelay,
    skipLateHydration,
  });

  if (!shouldAnimate || prefersReducedMotion) {
    return (
      <div {...(props as ComponentPropsWithoutRef<"div">)}>{children}</div>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        {...props}
        initial={{ opacity: 0, y: offset, scale }}
        transition={{
          duration: 0.45,
          ease: [0.22, 1, 0.36, 1],
          ...transition,
          delay: getMotionRevealDelaySeconds(delayMs),
        }}
        viewport={viewport}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}

function useShouldAnimate({
  maxHydrationDelay,
  skipLateHydration,
}: {
  maxHydrationDelay: number;
  skipLateHydration: boolean;
}) {
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  if (!hasHydrated) {
    return false;
  }

  const hydratedLate = getTimeSinceNavigationStart() > maxHydrationDelay;
  return !skipLateHydration || !hydratedLate;
}

function subscribeToHydration() {
  return () => {};
}

function getClientHydrationSnapshot() {
  return true;
}

function getServerHydrationSnapshot() {
  return false;
}

function getTimeSinceNavigationStart() {
  if (typeof performance === "undefined") {
    return 0;
  }

  return performance.now();
}
