'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type MorphingArrowButtonProps = {
  direction: 'left' | 'right';
  onClick?: () => void;
  className?: string;
};

const MorphingArrowButton = ({ direction, onClick, className }: MorphingArrowButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const isLeft = direction === 'left';
  const Icon = isLeft ? ArrowLeft : ArrowRight;

  return (
    <div
      className={cn('flex-shrink-0 relative', className)}
      style={{ width: 48, height: 48 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.button
        onClick={onClick}
        aria-label={isLeft ? 'Previous slide' : 'Next slide'}
        className="absolute top-0 flex items-center justify-center overflow-hidden cursor-pointer"
        style={{
          height: 48,
          background: '#f0fdf4',
          border: '1.5px solid rgba(22,163,74,0.35)',
          boxShadow: isHovered ? '0 4px 16px rgba(22,163,74,0.25)' : '0 2px 8px rgba(22,163,74,0.12)',
          // Expand from the inner edge outward
          right: isLeft ? 0 : 'auto',
          left: isLeft ? 'auto' : 0,
        }}
        animate={{
          width: isHovered ? 100 : 48,
          borderRadius: isHovered
            ? isLeft ? '24px 12px 12px 24px' : '12px 24px 24px 12px'
            : '50%',
        }}
        transition={{ duration: 0.28, ease: 'easeInOut' }}
      >
        {/* Arrow icon */}
        <Icon className="w-5 h-5 text-green-600" />
      </motion.button>
    </div>
  );
};

export default MorphingArrowButton;
