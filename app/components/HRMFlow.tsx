'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HRMStep {
  id: number;
  label: string;
  description: string;
  highlight: 'input' | 'f_in' | 'l_module' | 'h_module' | 'f_out' | 'output' | null;
  lActive: boolean;
  hActive: boolean;
  cycle: number;
  step: number;
}

const HRMFlow = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentLStep, setCurrentLStep] = useState(0);

  // Tạo các bước animation dựa trên kiến trúc HRM
  const generateSteps = (): HRMStep[] => {
    const steps: HRMStep[] = [];
    const T_MAX = 3; // Số cycles
    const K = 4; // Số steps trong mỗi cycle cho L-module

    // Step 0: Input
    steps.push({
      id: 0,
      label: 'Input',
      description: 'Dữ liệu đầu vào',
      highlight: 'input',
      lActive: false,
      hActive: false,
      cycle: 0,
      step: 0,
    });

    // Step 1: f_in
    steps.push({
      id: 1,
      label: 'f_in',
      description: 'Input Network: Chiếu input thành working memory',
      highlight: 'f_in',
      lActive: false,
      hActive: false,
      cycle: 0,
      step: 0,
    });

    // Các cycles
    for (let t = 0; t < T_MAX; t++) {
      // L-module updates (K steps)
      for (let k = 0; k < K; k++) {
        steps.push({
          id: steps.length,
          label: `L-module (Cycle ${t + 1}, Step ${k + 1})`,
          description: `Low-level Module: Xử lý nhanh, tính toán chi tiết (${k + 1}/${K})`,
          highlight: 'l_module',
          lActive: true,
          hActive: false,
          cycle: t + 1,
          step: k + 1,
        });
      }

      // H-module update (1 step)
      steps.push({
        id: steps.length,
        label: `H-module (Cycle ${t + 1})`,
        description: 'High-level Module: Cập nhật chiến lược, lập kế hoạch trừu tượng',
        highlight: 'h_module',
        lActive: false,
        hActive: true,
        cycle: t + 1,
        step: 0,
      });
    }

    // f_out
    steps.push({
      id: steps.length,
      label: 'f_out',
      description: 'Output Network: Tạo prediction từ hidden state',
      highlight: 'f_out',
      lActive: false,
      hActive: false,
      cycle: 0,
      step: 0,
    });

    // Output
    steps.push({
      id: steps.length,
      label: 'Output',
      description: 'Kết quả cuối cùng',
      highlight: 'output',
      lActive: false,
      hActive: false,
      cycle: 0,
      step: 0,
    });

    return steps;
  };

  const steps = generateSteps();

  // Auto-play logic
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000); // 2 giây mỗi bước

    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  const goToStep = (stepIndex: number) => {
    setCurrentStep(Math.max(0, Math.min(stepIndex, steps.length - 1)));
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-slate-900 rounded-lg">
      {/* Diagram */}
      <div className="relative w-full h-96 mb-6 bg-slate-800 rounded-lg p-8 overflow-hidden">
        {/* Input */}
        <motion.div
          className="absolute left-8 top-1/2 -translate-y-1/2"
          animate={{
            scale: currentStepData.highlight === 'input' ? 1.1 : 1,
            opacity: currentStepData.highlight === 'input' ? 1 : 0.6,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg">
            Input
          </div>
        </motion.div>

        {/* f_in */}
        <motion.div
          className="absolute left-32 top-1/2 -translate-y-1/2"
          animate={{
            scale: currentStepData.highlight === 'f_in' ? 1.1 : 1,
            opacity: currentStepData.highlight === 'f_in' ? 1 : 0.6,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg">
            f_in
          </div>
        </motion.div>

        {/* Arrow Input -> f_in */}
        <motion.svg
          className="absolute left-24 top-1/2 -translate-y-1/2"
          width="40"
          height="2"
          viewBox="0 0 40 2"
          animate={{
            opacity: currentStep >= 1 ? 1 : 0.3,
          }}
        >
          <motion.line
            x1="0"
            y1="1"
            x2="40"
            y2="1"
            stroke="#60a5fa"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: currentStep >= 1 ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          />
          <polygon
            points="40,1 35,0 35,2"
            fill="#60a5fa"
            opacity={currentStep >= 1 ? 1 : 0.3}
          />
        </motion.svg>

        {/* L-module */}
        <motion.div
          className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: currentStepData.lActive ? 1.15 : currentStepData.highlight === 'l_module' ? 1.1 : 1,
            opacity: currentStepData.lActive ? 1 : currentStepData.highlight === 'l_module' ? 0.8 : 0.5,
            boxShadow: currentStepData.lActive
              ? '0 0 20px rgba(34, 197, 94, 0.6)'
              : '0 0 0px rgba(34, 197, 94, 0)',
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-green-600 text-white px-8 py-4 rounded-lg font-semibold shadow-lg text-center min-w-[140px]">
            <div>L-module</div>
            <div className="text-xs mt-1 opacity-90">Low-level</div>
          </div>
        </motion.div>

        {/* H-module */}
        <motion.div
          className="absolute left-1/2 top-2/3 -translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: currentStepData.hActive ? 1.15 : currentStepData.highlight === 'h_module' ? 1.1 : 1,
            opacity: currentStepData.hActive ? 1 : currentStepData.highlight === 'h_module' ? 0.8 : 0.5,
            boxShadow: currentStepData.hActive
              ? '0 0 20px rgba(59, 130, 246, 0.6)'
              : '0 0 0px rgba(59, 130, 246, 0)',
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-blue-500 text-white px-8 py-4 rounded-lg font-semibold shadow-lg text-center min-w-[140px]">
            <div>H-module</div>
            <div className="text-xs mt-1 opacity-90">High-level</div>
          </div>
        </motion.div>

        {/* Bidirectional arrows between L and H */}
        <motion.svg
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          width="4"
          height="80"
          viewBox="0 0 4 80"
          animate={{
            opacity: currentStep >= 2 ? 1 : 0.3,
          }}
        >
          <motion.line
            x1="2"
            y1="0"
            x2="2"
            y2="80"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: currentStep >= 2 ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          />
          <motion.polygon
            points="2,0 0,8 4,8"
            fill="#94a3b8"
            animate={{ opacity: currentStep >= 2 ? 1 : 0.3 }}
          />
          <motion.polygon
            points="2,80 0,72 4,72"
            fill="#94a3b8"
            animate={{ opacity: currentStep >= 2 ? 1 : 0.3 }}
          />
        </motion.svg>

        {/* Arrow f_in -> Modules */}
        <motion.svg
          className="absolute left-48 top-1/2 -translate-y-1/2"
          width="120"
          height="2"
          viewBox="0 0 120 2"
          animate={{
            opacity: currentStep >= 2 ? 1 : 0.3,
          }}
        >
          <motion.line
            x1="0"
            y1="1"
            x2="120"
            y2="1"
            stroke="#60a5fa"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: currentStep >= 2 ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          />
          <polygon
            points="120,1 115,0 115,2"
            fill="#60a5fa"
            opacity={currentStep >= 2 ? 1 : 0.3}
          />
        </motion.svg>

        {/* Arrow Modules -> f_out */}
        <motion.svg
          className="absolute right-48 top-1/2 -translate-y-1/2"
          width="120"
          height="2"
          viewBox="0 0 120 2"
          animate={{
            opacity: currentStep >= steps.length - 2 ? 1 : 0.3,
          }}
        >
          <motion.line
            x1="0"
            y1="1"
            x2="120"
            y2="1"
            stroke="#60a5fa"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: currentStep >= steps.length - 2 ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          />
          <polygon
            points="120,1 115,0 115,2"
            fill="#60a5fa"
            opacity={currentStep >= steps.length - 2 ? 1 : 0.3}
          />
        </motion.svg>

        {/* f_out */}
        <motion.div
          className="absolute right-32 top-1/2 -translate-y-1/2"
          animate={{
            scale: currentStepData.highlight === 'f_out' ? 1.1 : 1,
            opacity: currentStepData.highlight === 'f_out' ? 1 : 0.6,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg">
            f_out
          </div>
        </motion.div>

        {/* Output */}
        <motion.div
          className="absolute right-8 top-1/2 -translate-y-1/2"
          animate={{
            scale: currentStepData.highlight === 'output' ? 1.1 : 1,
            opacity: currentStepData.highlight === 'output' ? 1 : 0.6,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg">
            Output
          </div>
        </motion.div>

        {/* Arrow f_out -> Output */}
        <motion.svg
          className="absolute right-24 top-1/2 -translate-y-1/2"
          width="40"
          height="2"
          viewBox="0 0 40 2"
          animate={{
            opacity: currentStep >= steps.length - 1 ? 1 : 0.3,
          }}
        >
          <motion.line
            x1="0"
            y1="1"
            x2="40"
            y2="1"
            stroke="#60a5fa"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: currentStep >= steps.length - 1 ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          />
          <polygon
            points="40,1 35,0 35,2"
            fill="#60a5fa"
            opacity={currentStep >= steps.length - 1 ? 1 : 0.3}
          />
        </motion.svg>
      </div>

      {/* Current Step Info */}
      <div className="bg-slate-800 rounded-lg p-4 mb-4">
        <div className="text-white">
          <div className="text-lg font-semibold mb-2">{currentStepData.label}</div>
          <div className="text-sm text-slate-300">{currentStepData.description}</div>
          {currentStepData.cycle > 0 && (
            <div className="text-xs text-slate-400 mt-2">
              Cycle: {currentStepData.cycle} | Step: {currentStepData.step}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={() => goToStep(currentStep + 1)}
            disabled={currentStep >= steps.length - 1}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
        <div className="text-slate-400 text-sm">
          {currentStep + 1} / {steps.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 w-full bg-slate-700 rounded-full h-2">
        <motion.div
          className="bg-blue-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
};

export default HRMFlow;

