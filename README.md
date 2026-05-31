# Metisor Engine (v0.1 Alpha Core)

A lightweight, high-performance Vulkan path-tracing engine framework written in native C++.

## Overview

Metisor is designed from the ground up for low-level performance, architectural efficiency, and minimal binary size. By avoiding heavy managed runtimes, external abstractions, and garbage-collected frameworks, Metisor achieves a compact ~1MB executable footprint while maintaining direct, sub-millisecond communication with the modern graphics pipeline. 

The core framework prioritizes explicit memory management, rigorous geometry culling math, and highly optimized hardware scheduling.

## Core Architecture

* **Pure Vulkan Integration:** Direct interface with the graphics API to bypass driver overhead and maximize compute throughput.
* **Ultra-Lightweight Footprint:** Native C++ design compiling down to a ~1MB binary for maximum instruction cache efficiency.
* **Low-Latency Pipelines:** Engineered for immediate swapchain handshakes and aggressive hardware-level resource management.
* **Future-Proof Design:** Structured to support future integration with custom Vulkan Compute pipelines and inline Assembly (x86-64) optimization.

## Legal & Governing Law

Metisor is proprietary software protected by a dedicated End User License Agreement (EULA). 

Pursuant to the terms of the license, this software and any associated legal disputes are governed strictly by the laws of **Flanders, Belgium**. Any legal actions, proceedings, or claims arising out of or relating to the Metisor engine shall be settled exclusively within the jurisdiction of the competent courts of Flanders. 

Please review the included `LICENSE.txt` file prior to executing or deploying the binary.
