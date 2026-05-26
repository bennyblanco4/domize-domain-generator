"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer 
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      viewport={{ once: true }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center">
          <div className="flex items-center space-x-1 text-sm text-white">
            <span>© {currentYear} Domize. Made with</span>
            <Heart size={12} className="text-red-400 fill-red-400" />
            <span>for entrepreneurs.</span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
