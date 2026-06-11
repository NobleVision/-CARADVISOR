/**
 * Single GSAP registration point for the landing experience.
 *
 * Every landing section imports { gsap, ScrollTrigger, useGSAP } from here —
 * never from "gsap" directly — so registration happens exactly once and the
 * dependency stays inside the lazy-loaded landing chunk.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger, useGSAP };
