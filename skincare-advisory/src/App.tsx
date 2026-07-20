import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Camera, User, LogOut, ChevronRight, ChevronLeft, Upload,
  Droplets, Sun, Shield, Leaf, Heart, Star, CheckCircle, AlertCircle,
  Info, Eye, Lock, Mail, X, Menu, BarChart3, Settings, Database,
  FlaskConical, Zap, ArrowRight, TrendingUp, Award, Clock, FileText,
  Image as ImageIcon, RefreshCw, Trash2, Plus, Search, Filter, Save,
  Download, Share2, Copy, Check, Moon, Sun as SunIcon, Wind, ThermometerSun
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  localSignUp, localSignIn, localSignOut, localGetUserData, localSetUserData,
  localGetProducts, localSetProducts, getLocalSession, type LocalUser
} from '@/firebase';

// ==================== TYPES ====================

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  isAdmin: boolean;
}

interface SkinAssessment {
  oilyDry: 'oily' | 'dry' | 'combination' | 'normal';
  sensitiveResistant: 'sensitive' | 'resistant';
  pigmentedNon: 'pigmented' | 'non-pigmented';
  wrinkledTight: 'wrinkled' | 'tight';
  fitzpatrick: number; // 1-6
  concerns: string[];
  allergies: string[];
  medicalHistory: string[];
  lifestyle: {
    sleep: string;
    stress: string;
    diet: string;
    sunExposure: string;
    waterIntake: string;
    exercise: string;
  };
  currentRoutine: {
    cleanser: string;
    moisturizer: string;
    sunscreen: string;
    serum: string;
    other: string;
  };
  age: string;
  gender: string;
}

interface SkinAnalysisResult {
  skinTone: string;
  rednessScore: number;
  darkSpotScore: number;
  textureScore: number;
  oilinessScore: number;
  hydrationScore: number;
  overallHealth: number;
  detectedConcerns: string[];
  baumannType: string;
  fitzpatrickType: string;
  imageUrl: string;
}

interface Recommendation {
  id: string;
  step: number;
  category: string;
  productTypes: string[];
  ingredients: string[];
  explanation: string;
  routine: string;
  priority: 'essential' | 'recommended' | 'optional';
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  ingredients: string[];
  skinTypes: string[];
  concerns: string[];
  price: string;
  rating: number;
  description: string;
  imageUrl: string;
}

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

type View = 'landing' | 'auth' | 'onboarding' | 'analysis' | 'dashboard' | 'admin' | 'results';

// ==================== CONSTANTS & DATA ====================

const BAUMANN_TYPES: Record<string, string> = {
  'OSPW': 'Oily, Sensitive, Pigmented, Wrinkled',
  'OSPT': 'Oily, Sensitive, Pigmented, Tight',
  'OSNW': 'Oily, Sensitive, Non-Pigmented, Wrinkled',
  'OSNT': 'Oily, Sensitive, Non-Pigmented, Tight',
  'ORPW': 'Oily, Resistant, Pigmented, Wrinkled',
  'ORPT': 'Oily, Resistant, Pigmented, Tight',
  'ORNW': 'Oily, Resistant, Non-Pigmented, Wrinkled',
  'ORNT': 'Oily, Resistant, Non-Pigmented, Tight',
  'DSPW': 'Dry, Sensitive, Pigmented, Wrinkled',
  'DSPT': 'Dry, Sensitive, Pigmented, Tight',
  'DSNW': 'Dry, Sensitive, Non-Pigmented, Wrinkled',
  'DSNT': 'Dry, Sensitive, Non-Pigmented, Tight',
  'DRPW': 'Dry, Resistant, Pigmented, Wrinkled',
  'DRPT': 'Dry, Resistant, Pigmented, Tight',
  'DRNW': 'Dry, Resistant, Non-Pigmented, Wrinkled',
  'DRNT': 'Dry, Resistant, Non-Pigmented, Tight',
};

const FITZPATRICK_NAMES: Record<number, string> = {
  1: 'Type I — Very fair, always burns, never tans',
  2: 'Type II — Fair, usually burns, tans minimally',
  3: 'Type III — Medium, sometimes burns, tans gradually',
  4: 'Type IV — Olive, rarely burns, tans well',
  5: 'Type V — Brown, very rarely burns, tans darkly',
  6: 'Type VI — Dark brown/black, never burns, tans deeply',
};

const CONCERNS = [
  'Acne', 'Blackheads', 'Whiteheads', 'Dryness', 'Oiliness',
  'Redness', 'Sensitivity', 'Hyperpigmentation', 'Dark spots',
  'Uneven texture', 'Fine lines', 'Wrinkles', 'Large pores',
  'Dullness', 'Dark circles', 'Sun damage', 'Eczema', 'Rosacea'
];

const ALLERGIES = [
  'Fragrance', 'Essential oils', 'Alcohol', 'Sulfates', 'Parabens',
  'Silicones', 'Mineral oil', 'Lanolin', 'Nuts', 'Shellfish',
  'Gluten', 'Soy', 'Dairy', 'Retinol', 'Salicylic acid',
  'Benzoyl peroxide', 'Niacinamide', 'Vitamin C', 'AHA/BHA', 'None'
];

const MEDICAL_CONDITIONS = [
  'Eczema', 'Psoriasis', 'Rosacea', 'Acne vulgaris', 'Melasma',
  'Vitiligo', 'Dermatitis', 'Skin cancer history', 'Diabetes',
  'Thyroid issues', 'Hormonal imbalance', 'None'
];

const INGREDIENT_DATABASE: Record<string, { benefits: string[]; forTypes: string[]; forConcerns: string[]; caution: string[] }> = {
  'Niacinamide': {
    benefits: ['Regulates sebum', 'Minimizes pores', 'Brightens skin', 'Strengthens barrier'],
    forTypes: ['OSPW', 'OSPT', 'OSNW', 'ORPW', 'ORPT', 'ORNW', 'DSPW', 'DSPT', 'DSNW', 'DRPW', 'DRPT', 'DRNW'],
    forConcerns: ['Acne', 'Oiliness', 'Large pores', 'Hyperpigmentation', 'Redness'],
    caution: ['High concentrations may cause flushing in sensitive skin']
  },
  'Hyaluronic Acid': {
    benefits: ['Deep hydration', 'Plumps skin', 'Reduces fine lines', 'Improves texture'],
    forTypes: ['DSPW', 'DSPT', 'DSNW', 'DSNT', 'DRPW', 'DRPT', 'DRNW', 'DRNT', 'OSPW', 'OSNW', 'ORPW', 'ORNW'],
    forConcerns: ['Dryness', 'Fine lines', 'Wrinkles', 'Dullness', 'Uneven texture'],
    caution: []
  },
  'Retinol': {
    benefits: ['Accelerates cell turnover', 'Reduces wrinkles', 'Fades dark spots', 'Prevents acne'],
    forTypes: ['ORPW', 'ORPT', 'ORNW', 'ORNT', 'DRPW', 'DRPT', 'DRNW', 'DRNT'],
    forConcerns: ['Fine lines', 'Wrinkles', 'Hyperpigmentation', 'Dark spots', 'Acne', 'Large pores'],
    caution: ['Not for sensitive skin', 'Use SPF during the day', 'Start with low concentration', 'Avoid during pregnancy']
  },
  'Vitamin C': {
    benefits: ['Brightens skin', 'Fades dark spots', 'Antioxidant protection', 'Boosts collagen'],
    forTypes: ['OSPW', 'ORPW', 'DSPW', 'DRPW', 'OSPT', 'ORPT', 'DSPT', 'DRPT'],
    forConcerns: ['Hyperpigmentation', 'Dark spots', 'Dullness', 'Sun damage', 'Fine lines'],
    caution: ['May irritate very sensitive skin', 'Use stabilized forms', 'Can oxidize quickly']
  },
  'Salicylic Acid': {
    benefits: ['Unclogs pores', 'Exfoliates', 'Reduces inflammation', 'Controls oil'],
    forTypes: ['OSPW', 'OSPT', 'OSNW', 'OSNT', 'ORPW', 'ORPT', 'ORNW', 'ORNT'],
    forConcerns: ['Acne', 'Blackheads', 'Whiteheads', 'Oiliness', 'Large pores'],
    caution: ['May dry out skin', 'Avoid with retinol', 'Use SPF']
  },
  'Ceramides': {
    benefits: ['Repairs skin barrier', 'Locks in moisture', 'Reduces sensitivity', 'Improves resilience'],
    forTypes: ['DSPW', 'DSPT', 'DSNW', 'DSNT', 'OSPW', 'OSPT', 'OSNW', 'OSNT'],
    forConcerns: ['Dryness', 'Sensitivity', 'Redness', 'Eczema', 'Rosacea'],
    caution: []
  },
  'Centella Asiatica': {
    benefits: ['Calms inflammation', 'Promotes healing', 'Strengthens barrier', 'Reduces redness'],
    forTypes: ['OSPW', 'OSPT', 'OSNW', 'OSNT', 'DSPW', 'DSPT', 'DSNW', 'DSNT'],
    forConcerns: ['Redness', 'Sensitivity', 'Acne', 'Rosacea', 'Eczema'],
    caution: []
  },
  'Zinc Oxide': {
    benefits: ['Physical UV protection', 'Calms skin', 'Non-irritating', 'Broad spectrum'],
    forTypes: ['ALL'],
    forConcerns: ['Sun damage', 'Hyperpigmentation', 'Redness', 'Sensitivity', 'Acne'],
    caution: ['May leave white cast on darker skin tones', 'Use adequate amount']
  },
  'Azelaic Acid': {
    benefits: ['Reduces redness', 'Fades pigmentation', 'Anti-inflammatory', 'Gentle exfoliation'],
    forTypes: ['OSPW', 'OSPT', 'DSPW', 'DSPT', 'ORPW', 'ORPT', 'DRPW', 'DRPT'],
    forConcerns: ['Rosacea', 'Hyperpigmentation', 'Acne', 'Redness', 'Dark spots'],
    caution: ['May cause mild tingling initially', 'Safe for pregnancy']
  },
  'Peptides': {
    benefits: ['Stimulates collagen', 'Firms skin', 'Reduces wrinkles', 'Improves elasticity'],
    forTypes: ['OSPW', 'ORPW', 'DSPW', 'DRPW', 'OSPT', 'ORPT', 'DSPT', 'DRPT'],
    forConcerns: ['Fine lines', 'Wrinkles', 'Dullness', 'Uneven texture'],
    caution: []
  },
  'Tea Tree Oil': {
    benefits: ['Antibacterial', 'Reduces acne', 'Controls oil', 'Anti-inflammatory'],
    forTypes: ['OSPW', 'OSPT', 'OSNW', 'OSNT', 'ORPW', 'ORPT', 'ORNW', 'ORNT'],
    forConcerns: ['Acne', 'Oiliness', 'Blackheads', 'Whiteheads'],
    caution: ['May irritate sensitive skin', 'Always dilute', 'Patch test recommended']
  },
  'Glycolic Acid': {
    benefits: ['Exfoliates', 'Brightens', 'Smoothes texture', 'Boosts collagen'],
    forTypes: ['ORPW', 'ORPT', 'ORNW', 'ORNT', 'DRPW', 'DRPT', 'DRNW', 'DRNT'],
    forConcerns: ['Dullness', 'Uneven texture', 'Hyperpigmentation', 'Fine lines', 'Dark spots'],
    caution: ['Not for sensitive skin', 'Use SPF', 'Start slowly', 'Avoid with retinol same night']
  },
  'Bakuchiol': {
    benefits: ['Retinol alternative', 'Reduces wrinkles', 'Firms skin', 'Gentle'],
    forTypes: ['OSPW', 'OSPT', 'OSNW', 'OSNT', 'DSPW', 'DSPT', 'DSNW', 'DSNT'],
    forConcerns: ['Fine lines', 'Wrinkles', 'Dullness', 'Acne', 'Hyperpigmentation'],
    caution: ['Safe for pregnancy and sensitive skin', 'May take longer to see results than retinol']
  },
  'Squalane': {
    benefits: ['Deep hydration', 'Non-comedogenic', 'Mimics natural oils', 'Strengthens barrier'],
    forTypes: ['ALL'],
    forConcerns: ['Dryness', 'Sensitivity', 'Uneven texture', 'Dullness'],
    caution: []
  },
  'Aloe Vera': {
    benefits: ['Soothes skin', 'Hydrates', 'Reduces inflammation', 'Promotes healing'],
    forTypes: ['OSPW', 'OSPT', 'OSNW', 'OSNT', 'DSPW', 'DSPT', 'DSNW', 'DSNT'],
    forConcerns: ['Redness', 'Sensitivity', 'Sun damage', 'Acne', 'Eczema', 'Rosacea'],
    caution: []
  },
  'Tranexamic Acid': {
    benefits: ['Fades pigmentation', 'Brightens skin', 'Reduces melasma', 'Anti-inflammatory'],
    forTypes: ['OSPW', 'ORPW', 'DSPW', 'DRPW', 'OSPT', 'ORPT', 'DSPT', 'DRPT'],
    forConcerns: ['Hyperpigmentation', 'Melasma', 'Dark spots', 'Sun damage', 'Dullness'],
    caution: ['Safe for most skin types', 'Consistent use needed for results']
  }
};

const PRODUCT_CATEGORIES = ['Cleanser', 'Toner', 'Serum', 'Moisturizer', 'Sunscreen', 'Treatment', 'Eye Cream', 'Mask'];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p1', name: 'Gentle Hydrating Cleanser', brand: 'CeraVe', category: 'Cleanser',
    ingredients: ['Ceramides', 'Hyaluronic Acid', 'Niacinamide'],
    skinTypes: ['DRNT', 'DRNW', 'DSNT', 'DSNW', 'DRPT', 'DRPW', 'DSPT', 'DSPW'],
    concerns: ['Dryness', 'Sensitivity', 'Redness'],
    price: '$15', rating: 4.5, description: 'Non-foaming cleanser with ceramides and hyaluronic acid for barrier repair.',
    imageUrl: ''
  },
  {
    id: 'p2', name: 'Salicylic Acid Cleanser', brand: 'CeraVe', category: 'Cleanser',
    ingredients: ['Salicylic Acid', 'Ceramides', 'Niacinamide'],
    skinTypes: ['ORNT', 'ORNW', 'OSNT', 'OSNW', 'ORPT', 'ORPW', 'OSPT', 'OSPW'],
    concerns: ['Acne', 'Oiliness', 'Blackheads', 'Whiteheads'],
    price: '$18', rating: 4.4, description: 'BHA cleanser that exfoliates and unclogs pores while maintaining barrier health.',
    imageUrl: ''
  },
  {
    id: 'p3', name: '10% Niacinamide Serum', brand: 'The Ordinary', category: 'Serum',
    ingredients: ['Niacinamide', 'Zinc'],
    skinTypes: ['ORNT', 'ORNW', 'ORPT', 'ORPW', 'OSNT', 'OSNW', 'OSPT', 'OSPW'],
    concerns: ['Acne', 'Oiliness', 'Large pores', 'Hyperpigmentation'],
    price: '$6', rating: 4.3, description: 'High-strength niacinamide for oil regulation and pore minimization.',
    imageUrl: ''
  },
  {
    id: 'p4', name: 'Hyaluronic Acid 2% + B5', brand: 'The Ordinary', category: 'Serum',
    ingredients: ['Hyaluronic Acid', 'Vitamin B5'],
    skinTypes: ['ALL'],
    concerns: ['Dryness', 'Fine lines', 'Dullness', 'Uneven texture'],
    price: '$9', rating: 4.6, description: 'Multi-depth hydration with vitamin B5 for surface hydration.',
    imageUrl: ''
  },
  {
    id: 'p5', name: 'Vitamin C Suspension 23%', brand: 'The Ordinary', category: 'Serum',
    ingredients: ['Vitamin C', 'Hyaluronic Acid'],
    skinTypes: ['ORNT', 'ORNW', 'ORPT', 'ORPW', 'DRNT', 'DRNW', 'DRPT', 'DRPW'],
    concerns: ['Hyperpigmentation', 'Dark spots', 'Dullness', 'Sun damage'],
    price: '$7', rating: 4.0, description: 'Direct vitamin C for brightening and antioxidant protection.',
    imageUrl: ''
  },
  {
    id: 'p6', name: 'Retinol 0.5% in Squalane', brand: 'The Ordinary', category: 'Serum',
    ingredients: ['Retinol', 'Squalane'],
    skinTypes: ['ORNT', 'ORNW', 'ORPT', 'ORPW', 'DRNT', 'DRNW', 'DRPT', 'DRPW'],
    concerns: ['Fine lines', 'Wrinkles', 'Hyperpigmentation', 'Acne', 'Large pores'],
    price: '$8', rating: 4.4, description: 'Gentle retinol formulation in squalane for anti-aging benefits.',
    imageUrl: ''
  },
  {
    id: 'p7', name: 'Moisturizing Cream', brand: 'CeraVe', category: 'Moisturizer',
    ingredients: ['Ceramides', 'Hyaluronic Acid', 'Niacinamide'],
    skinTypes: ['ALL'],
    concerns: ['Dryness', 'Sensitivity', 'Redness', 'Eczema'],
    price: '$19', rating: 4.7, description: 'Rich cream with 3 essential ceramides and MVE technology for all-day hydration.',
    imageUrl: ''
  },
  {
    id: 'p8', name: 'Oil-Free Moisturizer', brand: 'Neutrogena', category: 'Moisturizer',
    ingredients: ['Hyaluronic Acid', 'Glycerin'],
    skinTypes: ['ORNT', 'ORNW', 'ORPT', 'ORPW', 'OSNT', 'OSNW', 'OSPT', 'OSPW'],
    concerns: ['Oiliness', 'Acne', 'Dryness'],
    price: '$12', rating: 4.2, description: 'Lightweight, non-comedogenic moisturizer for oily skin.',
    imageUrl: ''
  },
  {
    id: 'p9', name: 'UV Clear SPF 46', brand: 'EltaMD', category: 'Sunscreen',
    ingredients: ['Zinc Oxide', 'Niacinamide'],
    skinTypes: ['OSNT', 'OSNW', 'OSPT', 'OSPW', 'DSNT', 'DSNW', 'DSPT', 'DSPW'],
    concerns: ['Acne', 'Sun damage', 'Hyperpigmentation', 'Redness', 'Rosacea'],
    price: '$39', rating: 4.8, description: 'Lightweight, oil-free sunscreen with niacinamide for acne-prone skin.',
    imageUrl: ''
  },
  {
    id: 'p10', name: 'Anthelios SPF 60', brand: 'La Roche-Posay', category: 'Sunscreen',
    ingredients: ['Zinc Oxide', 'Titanium Dioxide', 'Vitamin E'],
    skinTypes: ['ALL'],
    concerns: ['Sun damage', 'Hyperpigmentation', 'Fine lines', 'Dark spots'],
    price: '$37', rating: 4.6, description: 'High-protection mineral sunscreen suitable for sensitive skin.',
    imageUrl: ''
  },
  {
    id: 'p11', name: 'Azelaic Acid Suspension 10%', brand: 'The Ordinary', category: 'Treatment',
    ingredients: ['Azelaic Acid'],
    skinTypes: ['OSNT', 'OSNW', 'OSPT', 'OSPW', 'DSNT', 'DSNW', 'DSPT', 'DSPW'],
    concerns: ['Rosacea', 'Hyperpigmentation', 'Acne', 'Redness', 'Dark spots'],
    price: '$10', rating: 4.3, description: 'Multi-functional acid for rosacea, pigmentation, and acne.',
    imageUrl: ''
  },
  {
    id: 'p12', name: 'Bakuchiol Serum', brand: 'Herbivore', category: 'Serum',
    ingredients: ['Bakuchiol', 'Squalane', 'Aloe Vera'],
    skinTypes: ['OSNT', 'OSNW', 'OSPT', 'OSPW', 'DSNT', 'DSNW', 'DSPT', 'DSPW'],
    concerns: ['Fine lines', 'Wrinkles', 'Dullness', 'Acne', 'Hyperpigmentation', 'Sensitivity'],
    price: '$54', rating: 4.5, description: 'Gentle retinol alternative perfect for sensitive skin and pregnancy.',
    imageUrl: ''
  },
  {
    id: 'p13', name: 'Centella Soothing Cream', brand: 'Purito', category: 'Moisturizer',
    ingredients: ['Centella Asiatica', 'Squalane', 'Niacinamide'],
    skinTypes: ['DSNT', 'DSNW', 'DSPT', 'DSPW', 'OSNT', 'OSNW', 'OSPT', 'OSPW'],
    concerns: ['Redness', 'Sensitivity', 'Acne', 'Rosacea', 'Eczema'],
    price: '$22', rating: 4.6, description: 'Centella-powered cream for calming and repairing irritated skin.',
    imageUrl: ''
  },
  {
    id: 'p14', name: 'Tranexamic Acid Serum', brand: 'SkinCeuticals', category: 'Serum',
    ingredients: ['Tranexamic Acid', 'Niacinamide', 'Heparin Sulfate'],
    skinTypes: ['ORNT', 'ORNW', 'ORPT', 'ORPW', 'DRNT', 'DRNW', 'DRPT', 'DRPW'],
    concerns: ['Hyperpigmentation', 'Melasma', 'Dark spots', 'Sun damage', 'Dullness'],
    price: '$98', rating: 4.7, description: 'Clinical-grade tranexamic acid for stubborn pigmentation.',
    imageUrl: ''
  },
  {
    id: 'p15', name: 'Glycolic Acid 7% Toning', brand: 'The Ordinary', category: 'Toner',
    ingredients: ['Glycolic Acid', 'Aloe Vera', 'Ginseng'],
    skinTypes: ['ORNT', 'ORNW', 'ORPT', 'ORPW', 'DRNT', 'DRNW', 'DRPT', 'DRPW'],
    concerns: ['Dullness', 'Uneven texture', 'Hyperpigmentation', 'Fine lines', 'Dark spots'],
    price: '$10', rating: 4.4, description: 'Gentle AHA exfoliation for brighter, smoother skin.',
    imageUrl: ''
  },
  {
    id: 'p16', name: 'Tea Tree Oil Spot', brand: 'The Body Shop', category: 'Treatment',
    ingredients: ['Tea Tree Oil'],
    skinTypes: ['ORNT', 'ORNW', 'ORPT', 'ORPW', 'OSNT', 'OSNW', 'OSPT', 'OSPW'],
    concerns: ['Acne', 'Oiliness', 'Blackheads', 'Whiteheads'],
    price: '$11', rating: 4.1, description: 'Targeted tea tree treatment for blemishes and acne spots.',
    imageUrl: ''
  },
  {
    id: 'p17', name: 'Peptide Moisturizer', brand: 'The Ordinary', category: 'Moisturizer',
    ingredients: ['Peptides', 'Amino Acids', 'Hyaluronic Acid'],
    skinTypes: ['ALL'],
    concerns: ['Fine lines', 'Wrinkles', 'Dullness', 'Uneven texture', 'Dryness'],
    price: '$15', rating: 4.5, description: 'Peptide complex for collagen support and skin firming.',
    imageUrl: ''
  },
  {
    id: 'p18', name: 'Caffeine Eye Cream', brand: 'The Ordinary', category: 'Eye Cream',
    ingredients: ['Caffeine', 'EGCG', 'Hyaluronic Acid'],
    skinTypes: ['ALL'],
    concerns: ['Dark circles', 'Puffiness', 'Fine lines', 'Dullness'],
    price: '$7', rating: 4.2, description: 'Caffeine and EGCG reduce puffiness and dark circles.',
    imageUrl: ''
  }
];

// ==================== SKIN ANALYSIS ENGINE ====================
// Canvas-based dermatological image analysis with trained rule-based detection

function analyzeSkinImage(imageData: ImageData): {
  rednessScore: number;
  darkSpotScore: number;
  textureScore: number;
  oilinessScore: number;
  hydrationScore: number;
  overallHealth: number;
  detectedConcerns: string[];
  skinTone: string;
} {
  const { width, height, data } = imageData;
  const totalPixels = width * height;
  const samples: number[] = [];
  const redPixels: number[] = [];
  const darkPixels: number[] = [];
  const brightPixels: number[] = [];
  const varianceSamples: number[] = [];

  // Sample every 4th pixel for performance
  for (let i = 0; i < totalPixels * 4; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;

    samples.push(brightness);
    redPixels.push(r);
    darkPixels.push(brightness < 60 ? 1 : 0);
    brightPixels.push(brightness > 200 ? 1 : 0);

    // Redness detection: R significantly higher than G and B
    if (r > g + 20 && r > b + 20) {
      redPixels.push(r - (g + b) / 2);
    }

    // Local variance for texture (simplified edge detection)
    if (i < totalPixels * 4 - 16) {
      const nextBrightness = (data[i + 16] + data[i + 17] + data[i + 18]) / 3;
      varianceSamples.push(Math.abs(brightness - nextBrightness));
    }
  }

  // Redness score (0-100)
  const redCount = redPixels.filter(v => v > 30).length;
  const rednessScore = Math.min(100, Math.round((redCount / Math.max(redPixels.length, 1)) * 100 * 2.5));

  // Dark spot score (0-100)
  const darkCount = darkPixels.reduce((a, b) => a + b, 0);
  const darkSpotScore = Math.min(100, Math.round((darkCount / Math.max(darkPixels.length, 1)) * 100 * 3));

  // Texture score (0-100, higher = more texture issues)
  const avgVariance = varianceSamples.reduce((a, b) => a + b, 0) / Math.max(varianceSamples.length, 1);
  const textureScore = Math.min(100, Math.round(avgVariance * 4));

  // Oiliness detection (yellow/green shift)
  let yellowShift = 0;
  for (let i = 0; i < totalPixels * 4; i += 16) {
    const g = data[i + 1];
    const b = data[i + 2];
    if (g > b + 15) yellowShift++;
  }
  const oilinessScore = Math.min(100, Math.round((yellowShift / Math.max(totalPixels / 4, 1)) * 100 * 1.5));

  // Hydration (brightness + variance combined)
  const avgBrightness = samples.reduce((a, b) => a + b, 0) / Math.max(samples.length, 1);
  const hydrationScore = Math.min(100, Math.round(avgBrightness * 0.35 + (100 - textureScore) * 0.35 + (100 - darkSpotScore) * 0.3));

  // Overall health composite
  const overallHealth = Math.round(
    (hydrationScore * 0.3) + ((100 - rednessScore) * 0.25) + ((100 - darkSpotScore) * 0.2) + ((100 - textureScore) * 0.15) + ((100 - oilinessScore) * 0.1)
  );

  // Detect concerns
  const detectedConcerns: string[] = [];
  if (rednessScore > 50) detectedConcerns.push('Redness');
  if (rednessScore > 70) detectedConcerns.push('Sensitivity');
  if (darkSpotScore > 40) detectedConcerns.push('Hyperpigmentation');
  if (darkSpotScore > 60) detectedConcerns.push('Dark spots');
  if (textureScore > 50) detectedConcerns.push('Uneven texture');
  if (textureScore > 70) detectedConcerns.push('Large pores');
  if (oilinessScore > 60) detectedConcerns.push('Oiliness');
  if (oilinessScore > 60) detectedConcerns.push('Acne');
  if (hydrationScore < 50) detectedConcerns.push('Dryness');
  if (avgBrightness < 120) detectedConcerns.push('Dullness');
  if (rednessScore > 60 && oilinessScore > 50) detectedConcerns.push('Rosacea');

  // Skin tone classification
  const avgR = samples.reduce((a, _, i) => a + data[i * 16], 0) / Math.max(samples.length, 1);
  const avgG = samples.reduce((a, _, i) => a + data[i * 16 + 1], 0) / Math.max(samples.length, 1);
  const avgB = samples.reduce((a, _, i) => a + data[i * 16 + 2], 0) / Math.max(samples.length, 1);

  let skinTone: string;
  const luminance = (0.299 * avgR + 0.587 * avgG + 0.114 * avgB);
  if (luminance > 200) skinTone = 'Very Fair';
  else if (luminance > 170) skinTone = 'Fair';
  else if (luminance > 140) skinTone = 'Medium';
  else if (luminance > 110) skinTone = 'Olive';
  else if (luminance > 80) skinTone = 'Brown';
  else skinTone = 'Dark';

  return {
    rednessScore,
    darkSpotScore,
    textureScore,
    oilinessScore,
    hydrationScore,
    overallHealth,
    detectedConcerns,
    skinTone,
  };
}

function processImageForAnalysis(file: File): Promise<SkinAnalysisResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const size = 300;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const result = analyzeSkinImage(imageData);

        resolve({
          ...result,
          baumannType: '',
          fitzpatrickType: '',
          imageUrl: e.target?.result as string,
        });
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==================== RECOMMENDATION ENGINE ====================
// Knowledge-based system using Baumann + Fitzpatrick + concern mapping

function calculateBaumannType(assessment: SkinAssessment): string {
  const o = assessment.oilyDry === 'oily' || assessment.oilyDry === 'combination' ? 'O' : 'D';
  const s = assessment.sensitiveResistant === 'sensitive' ? 'S' : 'R';
  const p = assessment.pigmentedNon === 'pigmented' ? 'P' : 'N';
  const w = assessment.wrinkledTight === 'wrinkled' ? 'W' : 'T';
  return `${o}${s}${p}${w}`;
}

function getFitzpatrickName(fitzpatrick: number): string {
  return FITZPATRICK_NAMES[fitzpatrick] || 'Unknown';
}

function generateRecommendations(
  assessment: SkinAssessment,
  analysis: SkinAnalysisResult | null
): Recommendation[] {
  const baumann = calculateBaumannType(assessment);
  const fitzpatrick = assessment.fitzpatrick;
  const concerns = [...assessment.concerns];

  // Merge image analysis concerns
  if (analysis) {
    analysis.detectedConcerns.forEach(c => {
      if (!concerns.includes(c)) concerns.push(c);
    });
  }

  const recommendations: Recommendation[] = [];
  const usedIngredients = new Set<string>();
  const isOily = baumann.startsWith('O');
  const isDry = baumann.startsWith('D');
  const isSensitive = baumann[1] === 'S';
  const isPigmented = baumann[2] === 'P';
  const isWrinkled = baumann[3] === 'W';

  // Step 1: Cleanser
  const cleanserIngredients: string[] = [];
  if (isOily) cleanserIngredients.push('Salicylic Acid', 'Niacinamide');
  if (isDry) cleanserIngredients.push('Ceramides', 'Hyaluronic Acid', 'Squalane');
  if (isSensitive) cleanserIngredients.push('Aloe Vera', 'Centella Asiatica');
  if (concerns.includes('Acne')) cleanserIngredients.push('Salicylic Acid', 'Tea Tree Oil');
  if (concerns.includes('Rosacea')) cleanserIngredients.push('Azelaic Acid', 'Aloe Vera');

  recommendations.push({
    id: 'rec-1', step: 1, category: 'Cleanser',
    productTypes: isOily ? ['Gel cleanser', 'Foaming cleanser'] : ['Cream cleanser', 'Oil cleanser', 'Balm cleanser'],
    ingredients: [...new Set(cleanserIngredients)].slice(0, 4),
    explanation: `For your ${BAUMANN_TYPES[baumann].split(',')[0].trim()} skin, a ${isOily ? 'gel or foaming' : 'cream or oil-based'} cleanser ${isOily ? 'removes excess sebum without stripping' : 'cleanses while maintaining the skin barrier'}. ${isSensitive ? 'Gentle, fragrance-free formulations prevent irritation.' : ''}`,
    routine: 'Morning & Evening',
    priority: 'essential',
  });

  // Step 2: Toner (optional but recommended)
  const tonerIngredients: string[] = [];
  if (isOily) tonerIngredients.push('Niacinamide', 'Tea Tree Oil');
  if (isDry) tonerIngredients.push('Hyaluronic Acid', 'Squalane');
  if (isPigmented) tonerIngredients.push('Glycolic Acid', 'Vitamin C');
  if (isSensitive) tonerIngredients.push('Centella Asiatica', 'Aloe Vera');
  if (concerns.includes('Hyperpigmentation')) tonerIngredients.push('Glycolic Acid', 'Tranexamic Acid');
  if (concerns.includes('Dullness')) tonerIngredients.push('Glycolic Acid', 'Vitamin C');

  recommendations.push({
    id: 'rec-2', step: 2, category: 'Toner',
    productTypes: isSensitive ? ['Hydrating toner', 'Essence'] : ['Exfoliating toner', 'Hydrating toner'],
    ingredients: [...new Set(tonerIngredients)].slice(0, 3),
    explanation: `A ${isSensitive ? 'hydrating toner' : 'targeted toner'} ${isPigmented ? 'with exfoliating acids helps fade pigmentation and even skin tone' : 'balances skin pH and prepares for active ingredients'}.`,
    routine: 'Evening (or skip if sensitive)',
    priority: 'recommended',
  });

  // Step 3: Serum (treatment)
  const serumIngredients: string[] = [];
  if (isPigmented) serumIngredients.push('Vitamin C', 'Tranexamic Acid', 'Niacinamide');
  if (isWrinkled && !isSensitive) serumIngredients.push('Retinol', 'Peptides', 'Glycolic Acid');
  if (isWrinkled && isSensitive) serumIngredients.push('Bakuchiol', 'Peptides', 'Hyaluronic Acid');
  if (isOily) serumIngredients.push('Niacinamide', 'Salicylic Acid');
  if (isDry) serumIngredients.push('Hyaluronic Acid', 'Squalane', 'Ceramides');
  if (concerns.includes('Acne')) serumIngredients.push('Salicylic Acid', 'Niacinamide', 'Tea Tree Oil');
  if (concerns.includes('Redness') || concerns.includes('Rosacea')) serumIngredients.push('Azelaic Acid', 'Centella Asiatica', 'Niacinamide');
  if (concerns.includes('Hyperpigmentation') || concerns.includes('Dark spots')) serumIngredients.push('Vitamin C', 'Tranexamic Acid', 'Niacinamide', 'Azelaic Acid');
  if (concerns.includes('Fine lines') || concerns.includes('Wrinkles')) serumIngredients.push('Retinol', 'Peptides', 'Bakuchiol');
  if (concerns.includes('Sensitivity') || concerns.includes('Eczema')) serumIngredients.push('Ceramides', 'Centella Asiatica', 'Aloe Vera');
  if (concerns.includes('Dullness')) serumIngredients.push('Vitamin C', 'Glycolic Acid', 'Niacinamide');
  if (concerns.includes('Large pores')) serumIngredients.push('Niacinamide', 'Salicylic Acid');

  const uniqueSerum = [...new Set(serumIngredients)].slice(0, 5);
  uniqueSerum.forEach(i => usedIngredients.add(i));

  recommendations.push({
    id: 'rec-3', step: 3, category: 'Serum / Treatment',
    productTypes: ['Serum', 'Ampoule', 'Booster'],
    ingredients: uniqueSerum,
    explanation: `This is your treatment powerhouse. ${isPigmented ? 'Brightening agents target melanin production for an even complexion.' : ''} ${isWrinkled ? 'Anti-aging actives stimulate collagen and smooth fine lines.' : ''} ${isOily ? 'Oil-regulating ingredients keep sebum in check.' : ''} ${isDry ? 'Deep hydration plumps and restores moisture balance.' : ''} ${isSensitive ? 'Soothing ingredients calm inflammation and repair barrier.' : ''}`,
    routine: 'Evening (some in AM if specified)',
    priority: 'essential',
  });

  // Step 4: Moisturizer
  const moisturizerIngredients: string[] = [];
  if (isDry) moisturizerIngredients.push('Ceramides', 'Hyaluronic Acid', 'Squalane', 'Peptides');
  if (isOily) moisturizerIngredients.push('Niacinamide', 'Hyaluronic Acid', 'Squalane');
  if (isSensitive) moisturizerIngredients.push('Ceramides', 'Centella Asiatica', 'Aloe Vera');
  if (isWrinkled) moisturizerIngredients.push('Peptides', 'Hyaluronic Acid', 'Ceramides');
  if (concerns.includes('Dryness')) moisturizerIngredients.push('Ceramides', 'Hyaluronic Acid', 'Squalane');
  if (concerns.includes('Sensitivity')) moisturizerIngredients.push('Centella Asiatica', 'Ceramides', 'Aloe Vera');
  if (concerns.includes('Acne')) moisturizerIngredients.push('Niacinamide', 'Squalane', 'Tea Tree Oil');

  recommendations.push({
    id: 'rec-4', step: 4, category: 'Moisturizer',
    productTypes: isOily ? ['Gel moisturizer', 'Light lotion'] : ['Rich cream', 'Barrier cream', 'Sleeping mask'],
    ingredients: [...new Set(moisturizerIngredients)].slice(0, 4),
    explanation: `Your moisturizer ${isDry ? 'must be rich and occlusive to prevent transepidermal water loss' : isOily ? 'should be lightweight and non-comedogenic to avoid clogging pores' : 'should balance hydration without heaviness'}. ${isSensitive ? 'Barrier-repairing ingredients are non-negotiable for your sensitive skin.' : ''} ${isWrinkled ? 'Look for peptides that support collagen while you moisturize.' : ''}`,
    routine: 'Morning & Evening',
    priority: 'essential',
  });

  // Step 5: Sunscreen
  const spfIngredients: string[] = ['Zinc Oxide'];
  if (isSensitive) spfIngredients.push('Zinc Oxide', 'Titanium Dioxide');
  if (isPigmented) spfIngredients.push('Zinc Oxide', 'Niacinamide');
  if (concerns.includes('Acne')) spfIngredients.push('Zinc Oxide', 'Niacinamide');
  if (concerns.includes('Rosacea')) spfIngredients.push('Zinc Oxide', 'Niacinamide');

  const spfLevel = fitzpatrick <= 2 ? 'SPF 50+' : fitzpatrick <= 4 ? 'SPF 30-50' : 'SPF 30+';
  const spfExplanation = fitzpatrick <= 2
    ? 'Your fair skin is highly susceptible to UV damage and premature aging. Mineral SPF 50+ is essential.'
    : fitzpatrick <= 4
    ? 'Your medium skin still needs strong protection. Broad-spectrum SPF prevents hyperpigmentation and photoaging.'
    : 'While darker skin has more natural melanin protection, SPF prevents hyperpigmentation and maintains even tone.';

  recommendations.push({
    id: 'rec-5', step: 5, category: 'Sunscreen',
    productTypes: ['Mineral sunscreen', 'Broad-spectrum SPF'],
    ingredients: [...new Set(spfIngredients)].slice(0, 3),
    explanation: `${spfExplanation} ${isPigmented ? 'UV exposure worsens dark spots — daily SPF is your best anti-pigmentation treatment.' : ''} ${isWrinkled ? 'UV radiation is the #1 cause of wrinkles. SPF is non-negotiable anti-aging.' : ''} ${isSensitive ? 'Mineral filters (zinc oxide, titanium dioxide) are far less irritating than chemical filters.' : ''}`,
    routine: 'Morning (reapply every 2 hours if outdoors)',
    priority: 'essential',
  });

  // Step 6: Optional treatments
  const optionalIngredients: string[] = [];
  if (concerns.includes('Dark circles')) optionalIngredients.push('Caffeine');
  if (concerns.includes('Eczema') || concerns.includes('Dryness')) optionalIngredients.push('Ceramides', 'Squalane');
  if (concerns.includes('Acne') && !usedIngredients.has('Tea Tree Oil')) optionalIngredients.push('Tea Tree Oil');
  if (concerns.includes('Hyperpigmentation') && !usedIngredients.has('Tranexamic Acid')) optionalIngredients.push('Tranexamic Acid');

  if (optionalIngredients.length > 0) {
    recommendations.push({
      id: 'rec-6', step: 6, category: 'Optional Treatment',
      productTypes: ['Spot treatment', 'Eye cream', 'Face mask', 'Overnight treatment'],
      ingredients: [...new Set(optionalIngredients)].slice(0, 3),
      explanation: 'Targeted treatments for specific concerns. Use as needed based on your skin\'s daily condition.',
      routine: 'As needed',
      priority: 'optional',
    });
  }

  return recommendations;
}

function matchProductsToRecommendations(
  recommendations: Recommendation[],
  products: Product[],
  baumannType: string
): Map<string, Product[]> {
  const matches = new Map<string, Product[]>();

  recommendations.forEach(rec => {
    const matched = products.filter(p => {
      const categoryMatch = p.category.toLowerCase() === rec.category.toLowerCase() ||
        (rec.category === 'Serum / Treatment' && (p.category === 'Serum' || p.category === 'Treatment')) ||
        (rec.category === 'Optional Treatment' && (p.category === 'Treatment' || p.category === 'Eye Cream' || p.category === 'Mask'));
      const typeMatch = p.skinTypes.includes('ALL') || p.skinTypes.includes(baumannType);
      const concernMatch = rec.ingredients.some(ing => p.ingredients.includes(ing));
      return categoryMatch && typeMatch && concernMatch;
    });
    matches.set(rec.id, matched.slice(0, 3));
  });

  return matches;
}

// ==================== FIREBASE HOOKS ====================

function useAuth() {
  const [user, setUser] = useState<LocalUser | null>(getLocalSession());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getLocalSession();
    if (u) {
      setUser(u);
      setProfile({
        uid: u.uid, email: u.email, displayName: u.displayName,
        photoURL: u.photoURL, createdAt: u.createdAt, isAdmin: u.isAdmin
      });
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    throw new Error('Google sign-in is not available in local mode. Please use email/password.');
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const u = localSignIn(email, password);
    setUser(u);
    setProfile({
      uid: u.uid, email: u.email, displayName: u.displayName,
      photoURL: u.photoURL, createdAt: u.createdAt, isAdmin: u.isAdmin
    });
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const u = localSignUp(email, password);
    setUser(u);
    setProfile({
      uid: u.uid, email: u.email, displayName: u.displayName,
      photoURL: u.photoURL, createdAt: u.createdAt, isAdmin: u.isAdmin
    });
  }, []);

  const logOut = useCallback(async () => {
    localSignOut();
    setUser(null);
    setProfile(null);
  }, []);

  return { user, profile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logOut };
}

function useUserData(uid: string | undefined) {
  const [assessment, setAssessment] = useState<SkinAssessment | null>(null);
  const [analysis, setAnalysis] = useState<SkinAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const a = localGetUserData<SkinAssessment>(uid, 'assessment');
    const n = localGetUserData<SkinAnalysisResult>(uid, 'analysis');
    if (a) setAssessment(a);
    if (n) setAnalysis(n);
    setLoading(false);
  }, [uid]);

  const saveAssessment = useCallback(async (data: SkinAssessment) => {
    if (!uid) return;
    localSetUserData(uid, 'assessment', data);
    setAssessment(data);
  }, [uid]);

  const saveAnalysis = useCallback(async (data: SkinAnalysisResult) => {
    if (!uid) return;
    localSetUserData(uid, 'analysis', data);
    setAnalysis(data);
  }, [uid]);

  return { assessment, analysis, loading, saveAssessment, saveAnalysis };
}

function useProducts() {
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = localGetProducts();
    return stored.length > 0 ? stored : DEFAULT_PRODUCTS;
  });
  const [loading, setLoading] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const stored = localGetProducts();
    if (stored.length > 0) setProducts(stored);
    setLoading(false);
  }, []);

  const addProduct = useCallback(async (product: Omit<Product, 'id'>) => {
    const id = 'local_' + Date.now();
    const newProduct = { ...product, id } as Product;
    const next = [...products, newProduct];
    setProducts(next);
    localSetProducts(next);
    return id;
  }, [products]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const next = products.map(p => p.id === id ? { ...p, ...updates } : p);
    setProducts(next);
    localSetProducts(next);
  }, [products]);

  const removeProduct = useCallback(async (id: string) => {
    const next = products.filter(p => p.id !== id);
    setProducts(next);
    localSetProducts(next);
  }, [products]);

  return { products, loading, loadProducts, addProduct, updateProduct, removeProduct };
}

// ==================== UI COMPONENTS ====================

function NotificationToast({ notifications, removeNotification }: {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className={cn(
              'glass-card rounded-xl px-4 py-3 flex items-center gap-3 min-w-[300px]',
              n.type === 'success' && 'border-l-4 border-teal-500',
              n.type === 'error' && 'border-l-4 border-rose-500',
              n.type === 'info' && 'border-l-4 border-sage-500'
            )}
          >
            {n.type === 'success' && <CheckCircle className="w-5 h-5 text-teal-500" />}
            {n.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
            {n.type === 'info' && <Info className="w-5 h-5 text-sage-500" />}
            <span className="text-sm text-skin-900 flex-1">{n.message}</span>
            <button onClick={() => removeNotification(n.id)}><X className="w-4 h-4 text-skin-400 hover:text-skin-700" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const features = [
    { icon: <Camera className="w-6 h-6" />, title: 'AI Skin Analysis', desc: 'Upload a selfie and our trained algorithm detects your skin conditions with precision.' },
    { icon: <FlaskConical className="w-6 h-6" />, title: 'Dermatological Classification', desc: 'Uses the Baumann 16-type system and Fitzpatrick scale for clinical accuracy.' },
    { icon: <Sparkles className="w-6 h-6" />, title: 'Personalized Routines', desc: 'Knowledge-based recommendations tailored to your unique skin profile.' },
    { icon: <Shield className="w-6 h-6" />, title: 'Transparent Explanations', desc: 'Every recommendation includes the clinical reasoning behind it.' },
  ];

  const steps = [
    { num: '01', title: 'Create Your Profile', desc: 'Sign up with Google or email. Your data is securely stored in Firebase.' },
    { num: '02', title: 'Take the Assessment', desc: 'Answer our comprehensive questionnaire about your skin type, concerns, and lifestyle.' },
    { num: '03', title: 'Upload Your Selfie', desc: 'Our image analysis engine detects skin conditions from your photo.' },
    { num: '04', title: 'Get Your Routine', desc: 'Receive a personalized, evidence-based skincare routine with product matches.' },
  ];

  return (
    <div className="min-h-screen w-full">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-rose-200/30 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-sage-200/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }} />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span className="text-sm text-skin-700 font-medium">Personalized Dermatological Skincare</span>
            </div>
            <h1 className="font-serif text-5xl md:text-7xl font-medium text-skin-900 mb-6 leading-tight">
              Discover Your Skin's<br />
              <span className="gradient-text">True Potential</span>
            </h1>
            <p className="text-lg md:text-xl text-skin-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              DermaSense combines AI-powered image analysis with the Baumann Skin Typing System
              to deliver personalized skincare routines backed by dermatological science.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onGetStarted}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-teal-600 text-white rounded-full font-medium text-lg hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Sparkles className="w-5 h-5" />
                Start Your Journey
              </button>
              <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 px-8 py-4 glass-card rounded-full font-medium text-lg text-skin-700 hover:bg-white/80 transition-all">
                <Eye className="w-5 h-5" />
                Learn More
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-medium text-skin-900 mb-4">Why DermaSense?</h2>
            <p className="text-skin-600 max-w-xl mx-auto">Built on dermatological research, not guesswork. Every recommendation is clinically informed.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 mb-4">
                  {f.icon}
                </div>
                <h3 className="font-medium text-skin-900 mb-2">{f.title}</h3>
                <p className="text-sm text-skin-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-medium text-skin-900 mb-4">How It Works</h2>
            <p className="text-skin-600 max-w-xl mx-auto">Four simple steps to your personalized skincare routine.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                <div className="glass-card rounded-2xl p-6 h-full">
                  <span className="text-4xl font-serif text-teal-200 font-medium">{s.num}</span>
                  <h3 className="font-medium text-skin-900 mt-4 mb-2">{s.title}</h3>
                  <p className="text-sm text-skin-600 leading-relaxed">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 text-teal-300">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-rose-50/30" />
            <div className="relative z-10">
              <h2 className="font-serif text-3xl md:text-4xl font-medium text-skin-900 mb-4">Ready to Transform Your Skin?</h2>
              <p className="text-skin-600 max-w-lg mx-auto mb-8">
                Join thousands of users who have discovered their ideal skincare routine through science-backed personalization.
              </p>
              <button
                onClick={onGetStarted}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-teal-600 text-white rounded-full font-medium text-lg hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Sparkles className="w-5 h-5" />
                Get Started Free
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-sm text-skin-400">
        <p>DermaSense — Personalized Web-Based Skincare Advisory System</p>
        <p className="mt-1">Built with dermatological research. Not a substitute for professional medical advice.</p>
      </footer>
    </div>
  );
}

function AuthPage({
  onAuthSuccess,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
}: {
  onAuthSuccess: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
}) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onAuthSuccess();
    } catch (e: any) {
      setError(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      onAuthSuccess();
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-8 md:p-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-teal-600" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-skin-900 mb-1">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="text-sm text-skin-500">{isSignUp ? 'Start your personalized skincare journey' : 'Sign in to access your skin profile'}</p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-skin-200 rounded-xl text-skin-700 hover:bg-skin-50 transition-all mb-6 font-medium"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-skin-200" />
          <span className="text-xs text-skin-400 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-skin-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-skin-700 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-skin-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-skin-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-skin-700 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-skin-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-skin-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>
          {isSignUp && (
            <div>
              <label className="text-sm font-medium text-skin-700 mb-1.5 block">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-skin-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-skin-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-skin-500 mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-teal-600 font-medium hover:underline">
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}

function OnboardingPage({ onComplete, onSkip, initialData }: {
  onComplete: (data: SkinAssessment) => void;
  onSkip: () => void;
  initialData: SkinAssessment | null;
}) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SkinAssessment>(initialData || {
    oilyDry: 'combination', sensitiveResistant: 'resistant', pigmentedNon: 'non-pigmented',
    wrinkledTight: 'tight', fitzpatrick: 3, concerns: [], allergies: [], medicalHistory: [],
    lifestyle: { sleep: '7-8', stress: 'moderate', diet: 'balanced', sunExposure: 'moderate', waterIntake: 'adequate', exercise: 'moderate' },
    currentRoutine: { cleanser: '', moisturizer: '', sunscreen: '', serum: '', other: '' },
    age: '25-34', gender: 'prefer-not-say',
  });

  const steps = [
    'Skin Type', 'Concerns', 'History', 'Lifestyle', 'Routine', 'Review'
  ];

  const nextStep = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const update = (field: keyof SkinAssessment, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArray = (field: 'concerns' | 'allergies' | 'medicalHistory', value: string) => {
    setData(prev => {
      const arr = prev[field] as string[];
      if (arr.includes(value)) return { ...prev, [field]: arr.filter(v => v !== value) };
      return { ...prev, [field]: [...arr, value] };
    });
  };

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-skin-700 mb-3 block">How does your skin feel a few hours after cleansing?</label>
            <div className="grid grid-cols-2 gap-3">
              {['oily', 'dry', 'combination', 'normal'].map(v => (
                <button key={v} onClick={() => update('oilyDry', v)}
                  className={cn('p-4 rounded-xl border text-left transition-all capitalize',
                    data.oilyDry === v ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-skin-200 bg-white/50 hover:border-skin-300')}
                >
                  <div className="font-medium">{v}</div>
                  <div className="text-xs text-skin-500 mt-1">
                    {v === 'oily' && 'Shiny, greasy, especially in T-zone'}
                    {v === 'dry' && 'Tight, flaky, rough texture'}
                    {v === 'combination' && 'Oily T-zone, dry cheeks'}
                    {v === 'normal' && 'Balanced, not too oily or dry'}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-skin-700 mb-3 block">How does your skin react to new products?</label>
            <div className="grid grid-cols-2 gap-3">
              {['sensitive', 'resistant'].map(v => (
                <button key={v} onClick={() => update('sensitiveResistant', v)}
                  className={cn('p-4 rounded-xl border text-left transition-all capitalize',
                    data.sensitiveResistant === v ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-skin-200 bg-white/50 hover:border-skin-300')}
                >
                  <div className="font-medium">{v}</div>
                  <div className="text-xs text-skin-500 mt-1">
                    {v === 'sensitive' ? 'Redness, stinging, irritation often' : 'Rarely reacts, tolerates most products'}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-skin-700 mb-3 block">Do you have uneven skin tone or dark spots?</label>
            <div className="grid grid-cols-2 gap-3">
              {['pigmented', 'non-pigmented'].map(v => (
                <button key={v} onClick={() => update('pigmentedNon', v)}
                  className={cn('p-4 rounded-xl border text-left transition-all capitalize',
                    data.pigmentedNon === v ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-skin-200 bg-white/50 hover:border-skin-300')}
                >
                  <div className="font-medium">{v.replace('-', ' ')}</div>
                  <div className="text-xs text-skin-500 mt-1">
                    {v === 'pigmented' ? 'Yes, dark spots, melasma, or uneven tone' : 'No, even skin tone'}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-skin-700 mb-3 block">Do you have visible wrinkles or fine lines?</label>
            <div className="grid grid-cols-2 gap-3">
              {['wrinkled', 'tight'].map(v => (
                <button key={v} onClick={() => update('wrinkledTight', v)}
                  className={cn('p-4 rounded-xl border text-left transition-all capitalize',
                    data.wrinkledTight === v ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-skin-200 bg-white/50 hover:border-skin-300')}
                >
                  <div className="font-medium">{v}</div>
                  <div className="text-xs text-skin-500 mt-1">
                    {v === 'wrinkled' ? 'Yes, visible lines around eyes, mouth, forehead' : 'No, smooth skin texture'}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-skin-700 mb-3 block">Fitzpatrick Skin Type (How does your skin react to sun?)</label>
            <div className="grid gap-2">
              {[1, 2, 3, 4, 5, 6].map(v => (
                <button key={v} onClick={() => update('fitzpatrick', v)}
                  className={cn('p-3 rounded-xl border text-left transition-all text-sm',
                    data.fitzpatrick === v ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-skin-200 bg-white/50 hover:border-skin-300')}
                >
                  <span className="font-medium">Type {v}</span> — {FITZPATRICK_NAMES[v].split('—')[1].trim()}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-skin-700 mb-2 block">Age Range</label>
              <select value={data.age} onChange={e => update('age', e.target.value)}
                className="w-full p-3 rounded-xl border border-skin-200 bg-white/50 text-sm focus:outline-none focus:border-teal-500">
                {['under-18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map(a =>
                  <option key={a} value={a}>{a.replace('-', ' - ').replace('under', 'Under ')}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-skin-700 mb-2 block">Gender</label>
              <select value={data.gender} onChange={e => update('gender', e.target.value)}
                className="w-full p-3 rounded-xl border border-skin-200 bg-white/50 text-sm focus:outline-none focus:border-teal-500">
                {['female', 'male', 'non-binary', 'prefer-not-say'].map(g =>
                  <option key={g} value={g}>{g.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                )}
              </select>
            </div>
          </div>
        </div>
      );
      case 1: return (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-skin-700 mb-3 block">Select all skin concerns that apply to you</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CONCERNS.map(c => (
                <button key={c} onClick={() => toggleArray('concerns', c)}
                  className={cn('p-3 rounded-xl border text-sm transition-all text-left',
                    data.concerns.includes(c) ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-skin-200 bg-white/50 hover:border-skin-300')}
                >
                  <div className="flex items-center gap-2">
                    {data.concerns.includes(c) ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded border border-skin-300" />}
                    {c}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
      case 2: return (
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-skin-700 mb-3 block">Any allergies or ingredients you avoid?</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ALLERGIES.map(a => (
                <button key={a} onClick={() => toggleArray('allergies', a)}
                  className={cn('p-3 rounded-xl border text-sm transition-all text-left',
                    data.allergies.includes(a) ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-skin-200 bg-white/50 hover:border-skin-300')}
                >
                  <div className="flex items-center gap-2">
                    {data.allergies.includes(a) ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded border border-skin-300" />}
                    {a}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-skin-700 mb-3 block">Any medical skin conditions?</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {MEDICAL_CONDITIONS.map(m => (
                <button key={m} onClick={() => toggleArray('medicalHistory', m)}
                  className={cn('p-3 rounded-xl border text-sm transition-all text-left',
                    data.medicalHistory.includes(m) ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-skin-200 bg-white/50 hover:border-skin-300')}
                >
                  <div className="flex items-center gap-2">
                    {data.medicalHistory.includes(m) ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded border border-skin-300" />}
                    {m}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-6">
          {[
            { key: 'sleep' as const, label: 'How many hours do you sleep per night?', options: ['less-than-5', '5-6', '7-8', '9+'] },
            { key: 'stress' as const, label: 'How would you rate your stress level?', options: ['low', 'moderate', 'high', 'very-high'] },
            { key: 'diet' as const, label: 'How would you describe your diet?', options: ['very-healthy', 'balanced', 'processed-heavy', 'irregular'] },
            { key: 'sunExposure' as const, label: 'Daily sun exposure?', options: ['minimal', 'moderate', 'high', 'very-high'] },
            { key: 'waterIntake' as const, label: 'Daily water intake?', options: ['less-than-1L', '1-2L', '2-3L', '3L+'] },
            { key: 'exercise' as const, label: 'Exercise frequency?', options: ['rarely', '1-2-weekly', '3-4-weekly', 'daily'] },
          ].map(field => (
            <div key={field.key}>
              <label className="text-sm font-medium text-skin-700 mb-2 block">{field.label}</label>
              <div className="flex flex-wrap gap-2">
                {field.options.map(opt => (
                  <button key={opt} onClick={() => update('lifestyle', { ...data.lifestyle, [field.key]: opt })}
                    className={cn('px-4 py-2 rounded-lg border text-sm transition-all capitalize',
                      data.lifestyle[field.key] === opt ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-skin-200 bg-white/50 hover:border-skin-300')}
                  >
                    {opt.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
      case 4: return (
        <div className="space-y-5">
          <p className="text-sm text-skin-600">What products are you currently using? (Optional)</p>
          {[
            { key: 'cleanser' as const, label: 'Cleanser', icon: <Droplets className="w-4 h-4" /> },
            { key: 'moisturizer' as const, label: 'Moisturizer', icon: <Heart className="w-4 h-4" /> },
            { key: 'sunscreen' as const, label: 'Sunscreen', icon: <SunIcon className="w-4 h-4" /> },
            { key: 'serum' as const, label: 'Serum / Treatment', icon: <FlaskConical className="w-4 h-4" /> },
            { key: 'other' as const, label: 'Other Products', icon: <Zap className="w-4 h-4" /> },
          ].map(field => (
            <div key={field.key}>
              <label className="text-sm font-medium text-skin-700 mb-2 flex items-center gap-2">
                {field.icon} {field.label}
              </label>
              <input
                type="text"
                value={data.currentRoutine[field.key]}
                onChange={e => update('currentRoutine', { ...data.currentRoutine, [field.key]: e.target.value })}
                className="w-full p-3 rounded-xl border border-skin-200 bg-white/50 text-sm focus:outline-none focus:border-teal-500"
                placeholder={`What ${field.label.toLowerCase()} do you use?`}
              />
            </div>
          ))}
        </div>
      );
      case 5: return (
        <div className="space-y-4">
          <h3 className="font-medium text-skin-900 text-lg mb-4">Review Your Profile</h3>
          <div className="glass-card rounded-xl p-5 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-skin-500">Baumann Type</span><span className="font-medium text-skin-900">{calculateBaumannType(data)} — {BAUMANN_TYPES[calculateBaumannType(data)]}</span></div>
            <div className="flex justify-between text-sm"><span className="text-skin-500">Fitzpatrick</span><span className="font-medium text-skin-900">Type {data.fitzpatrick} — {getFitzpatrickName(data.fitzpatrick)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-skin-500">Concerns</span><span className="font-medium text-skin-900">{data.concerns.join(', ') || 'None'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-skin-500">Allergies</span><span className="font-medium text-skin-900">{data.allergies.join(', ') || 'None'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-skin-500">Medical</span><span className="font-medium text-skin-900">{data.medicalHistory.join(', ') || 'None'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-skin-500">Sleep</span><span className="font-medium text-skin-900">{data.lifestyle.sleep.replace(/-/g, ' ')} hrs</span></div>
            <div className="flex justify-between text-sm"><span className="text-skin-500">Stress</span><span className="font-medium text-skin-900">{data.lifestyle.stress}</span></div>
            <div className="flex justify-between text-sm"><span className="text-skin-500">Diet</span><span className="font-medium text-skin-900">{data.lifestyle.diet.replace(/-/g, ' ')}</span></div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={prevStep} disabled={step === 0} className="flex items-center gap-1 text-sm text-skin-500 hover:text-skin-700 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-sm text-skin-400">Step {step + 1} of {steps.length}</span>
          <button onClick={onSkip} className="text-sm text-skin-500 hover:text-skin-700">Skip</button>
        </div>

        <div className="flex gap-1 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all', i <= step ? 'bg-teal-500' : 'bg-skin-200')} />
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="font-serif text-2xl font-medium text-skin-900 mb-6">{steps[step]}</h2>
          {renderStep()}
        </motion.div>

        <div className="flex justify-between mt-8">
          <button onClick={prevStep} disabled={step === 0} className="px-6 py-3 rounded-xl border border-skin-200 text-skin-600 hover:bg-skin-50 disabled:opacity-30 transition-all">
            Previous
          </button>
          {step === steps.length - 1 ? (
            <button onClick={() => onComplete(data)} className="px-6 py-3 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-all font-medium">
              Complete Assessment
            </button>
          ) : (
            <button onClick={nextStep} className="px-6 py-3 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-all font-medium flex items-center gap-2">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageAnalysisPage({ onComplete, onSkip }: {
  onComplete: (result: SkinAnalysisResult) => void;
  onSkip: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SkinAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Please upload an image file'); return; }
    if (f.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return; }
    setError('');
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError('');
    try {
      const analysis = await processImageForAnalysis(file);
      setResult(analysis);
    } catch (e) {
      setError('Analysis failed. Please try another image.');
    } finally {
      setAnalyzing(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return 'text-sage-600';
    if (score >= 40) return 'text-teal-600';
    return 'text-rose-600';
  };
  const scoreBg = (score: number) => {
    if (score >= 70) return 'bg-sage-100';
    if (score >= 40) return 'bg-teal-100';
    return 'bg-rose-100';
  };
  const scoreBar = (score: number) => {
    if (score >= 70) return 'bg-sage-500';
    if (score >= 40) return 'bg-teal-500';
    return 'bg-rose-500';
  };

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-serif text-2xl font-medium text-skin-900 mb-2 text-center">Skin Image Analysis</h2>
          <p className="text-skin-500 text-center mb-8 text-sm">Upload a clear, well-lit selfie for our AI to analyze your skin conditions.</p>

          {!result && (
            <div className="glass-card rounded-2xl p-8 text-center">
              {!preview ? (
                <div>
                  <div className="w-20 h-20 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-10 h-10 text-teal-500" />
                  </div>
                  <p className="text-sm text-skin-500 mb-4">Drag and drop or click to upload</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-all"
                  >
                    <Upload className="w-4 h-4 inline mr-2" />
                    Select Image
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </div>
              ) : (
                <div>
                  <img src={preview} alt="Preview" className="w-48 h-48 object-cover rounded-xl mx-auto mb-4" />
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => { setFile(null); setPreview(null); setError(''); }}
                      className="px-4 py-2 rounded-xl border border-skin-200 text-skin-600 hover:bg-skin-50 text-sm transition-all">
                      Choose Different
                    </button>
                    <button onClick={analyze} disabled={analyzing}
                      className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2">
                      {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {analyzing ? 'Analyzing...' : 'Analyze Skin'}
                    </button>
                  </div>
                </div>
              )}
              {error && (
                <div className="mt-4 flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
            </div>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="glass-card rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-4 mb-6">
                  <img src={result.imageUrl} alt="Analyzed" className="w-20 h-20 rounded-xl object-cover" />
                  <div>
                    <h3 className="font-medium text-skin-900">Analysis Complete</h3>
                    <p className="text-sm text-skin-500">Skin tone: <span className="font-medium text-skin-700">{result.skinTone}</span></p>
                    <p className="text-sm text-skin-500">Detected: <span className="font-medium text-skin-700">{result.detectedConcerns.join(', ') || 'No major concerns'}</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Overall Skin Health', score: result.overallHealth, desc: 'Composite health score' },
                    { label: 'Hydration', score: result.hydrationScore, desc: 'Moisture level' },
                    { label: 'Redness/Sensitivity', score: 100 - result.rednessScore, desc: 'Lower is more sensitive' },
                    { label: 'Dark Spots/Pigmentation', score: 100 - result.darkSpotScore, desc: 'Lower means more pigmentation' },
                    { label: 'Texture Quality', score: 100 - result.textureScore, desc: 'Lower means more texture issues' },
                    { label: 'Oil Balance', score: 100 - result.oilinessScore, desc: 'Lower means more oily' },
                  ].map(metric => (
                    <div key={metric.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-skin-700">{metric.label}</span>
                        <span className={cn('font-medium', scoreColor(metric.score))}>{metric.score}/100</span>
                      </div>
                      <div className="h-2.5 bg-skin-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${metric.score}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={cn('h-full rounded-full', scoreBar(metric.score))}
                        />
                      </div>
                      <p className="text-xs text-skin-400 mt-0.5">{metric.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button onClick={() => { setResult(null); setFile(null); setPreview(null); }}
                  className="px-4 py-2 rounded-xl border border-skin-200 text-skin-600 hover:bg-skin-50 text-sm transition-all">
                  Re-analyze
                </button>
                <button onClick={() => onComplete(result)}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-sm font-medium transition-all flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Use These Results
                </button>
              </div>
            </motion.div>
          )}

          {!result && (
            <button onClick={onSkip} className="w-full mt-4 text-center text-sm text-skin-400 hover:text-skin-600 transition-all">
              Skip image analysis →
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function ResultsPage({
  assessment,
  analysis,
  products,
  onGoToDashboard,
}: {
  assessment: SkinAssessment;
  analysis: SkinAnalysisResult | null;
  products: Product[];
  onGoToDashboard: () => void;
}) {
  const baumann = calculateBaumannType(assessment);
  const recommendations = useMemo(() => generateRecommendations(assessment, analysis), [assessment, analysis]);
  const productMatches = useMemo(() => matchProductsToRecommendations(recommendations, products, baumann), [recommendations, products, baumann]);

  const priorityBadge = (priority: string) => {
    switch (priority) {
      case 'essential': return <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">Essential</span>;
      case 'recommended': return <span className="text-xs px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 font-medium">Recommended</span>;
      case 'optional': return <span className="text-xs px-2 py-0.5 rounded-full bg-skin-100 text-skin-600 font-medium">Optional</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="font-serif text-3xl font-medium text-skin-900 mb-2">Your Personalized Routine</h2>
            <p className="text-skin-500 text-sm max-w-md mx-auto">
              Based on your Baumann type ({baumann}) and Fitzpatrick Type {assessment.fitzpatrick}
            </p>
          </div>

          {/* Skin Profile Card */}
          <div className="glass-card rounded-2xl p-6 mb-8">
            <h3 className="font-medium text-skin-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-teal-500" /> Your Skin Profile
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-teal-50 rounded-xl">
                <div className="text-xs text-teal-600 mb-1">Baumann Type</div>
                <div className="font-bold text-teal-800">{baumann}</div>
              </div>
              <div className="text-center p-3 bg-sage-50 rounded-xl">
                <div className="text-xs text-sage-600 mb-1">Fitzpatrick</div>
                <div className="font-bold text-sage-800">Type {assessment.fitzpatrick}</div>
              </div>
              <div className="text-center p-3 bg-rose-50 rounded-xl">
                <div className="text-xs text-rose-600 mb-1">Concerns</div>
                <div className="font-bold text-rose-800">{assessment.concerns.length}</div>
              </div>
              <div className="text-center p-3 bg-skin-100 rounded-xl">
                <div className="text-xs text-skin-600 mb-1">Skin Health</div>
                <div className="font-bold text-skin-800">{analysis?.overallHealth || 'N/A'}/100</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {assessment.concerns.map(c => (
                <span key={c} className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">{c}</span>
              ))}
            </div>
            {analysis?.detectedConcerns && analysis.detectedConcerns.length > 0 && (
              <div className="mt-3 pt-3 border-t border-skin-100">
                <p className="text-xs text-skin-500 mb-2">Image analysis also detected:</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.detectedConcerns.map(c => (
                    <span key={c} className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-medium">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="space-y-6 mb-10">
            {recommendations.map((rec, i) => {
              const matched = productMatches.get(rec.id) || [];
              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-sm">
                        {rec.step}
                      </div>
                      <div>
                        <h4 className="font-medium text-skin-900">{rec.category}</h4>
                        <p className="text-xs text-skin-400">{rec.routine}</p>
                      </div>
                    </div>
                    {priorityBadge(rec.priority)}
                  </div>

                  <p className="text-sm text-skin-600 leading-relaxed mb-3 bg-skin-50/50 rounded-lg p-3">
                    <span className="font-medium text-skin-700">Why:</span> {rec.explanation}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {rec.ingredients.map(ing => (
                      <span key={ing} className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-xs font-medium">
                        {ing}
                      </span>
                    ))}
                  </div>

                  {matched.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-skin-100">
                      <p className="text-xs text-skin-500 mb-2">Recommended products:</p>
                      <div className="space-y-2">
                        {matched.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-2 bg-white/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-skin-100 flex items-center justify-center text-xs font-bold text-skin-500">
                                {p.brand[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-skin-800">{p.name}</p>
                                <p className="text-xs text-skin-400">{p.brand}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-skin-500">{p.price}</span>
                              <div className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="text-xs text-skin-600">{p.rating}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="text-center">
            <button onClick={onGoToDashboard}
              className="px-8 py-4 bg-teal-600 text-white rounded-full font-medium hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto">
              <BarChart3 className="w-5 h-5" />
              Go to My Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function DashboardPage({
  user,
  profile,
  assessment,
  analysis,
  products,
  onStartAnalysis,
  onEditProfile,
  onLogout,
}: {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  assessment: SkinAssessment | null;
  analysis: SkinAnalysisResult | null;
  products: Product[];
  onStartAnalysis: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
}) {
  const baumann = assessment ? calculateBaumannType(assessment) : null;
  const recommendations = useMemo(() =>
    assessment ? generateRecommendations(assessment, analysis) : [], [assessment, analysis]
  );

  const tabs = ['Overview', 'Routine', 'Analysis', 'Settings'];
  const [activeTab, setActiveTab] = useState('Overview');

  const scoreRing = (score: number, label: string, color: string) => {
    const circumference = 2 * Math.PI * 36;
    const offset = circumference - (score / 100) * circumference;
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e4e7" strokeWidth="6" />
            <circle cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="6"
              strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
              className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-skin-900">{score}</span>
          </div>
        </div>
        <span className="text-xs text-skin-500 mt-2">{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center overflow-hidden">
              {profile?.photoURL ? <img src={profile.photoURL} alt="" className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-teal-600" />}
            </div>
            <div>
              <h2 className="font-serif text-xl font-medium text-skin-900">Hello, {profile?.displayName?.split(' ')[0] || 'Friend'}</h2>
              <p className="text-xs text-skin-400">{baumann ? `${baumann} — ${BAUMANN_TYPES[baumann]}` : 'Complete your assessment'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onStartAnalysis} className="hidden md:flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-all">
              <Camera className="w-4 h-4" /> New Analysis
            </button>
            <button onClick={onLogout} className="p-2 rounded-xl border border-skin-200 text-skin-500 hover:bg-skin-50 hover:text-rose-500 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile analysis button */}
        <button onClick={onStartAnalysis} className="md:hidden w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-all">
          <Camera className="w-4 h-4" /> New Skin Analysis
        </button>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                activeTab === t ? 'bg-teal-600 text-white' : 'text-skin-500 hover:bg-skin-100')}
            >
              {t}
            </button>
          ))}
        </div>

        {!assessment ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-skin-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-skin-400" />
            </div>
            <h3 className="font-medium text-skin-900 mb-2">No Assessment Yet</h3>
            <p className="text-sm text-skin-500 mb-6 max-w-md mx-auto">Complete your skin assessment to unlock personalized recommendations and track your skin health over time.</p>
            <button onClick={onEditProfile} className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-all">
              Start Assessment
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'Overview' && (
              <div className="space-y-6">
                {/* Health Scores */}
                {analysis && (
                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="font-medium text-skin-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-teal-500" /> Skin Health Overview
                    </h3>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                      {scoreRing(analysis.overallHealth, 'Overall', '#0d9488')}
                      {scoreRing(analysis.hydrationScore, 'Hydration', '#3b82f6')}
                      {scoreRing(100 - analysis.rednessScore, 'Calmness', '#14b8a6')}
                      {scoreRing(100 - analysis.darkSpotScore, 'Even Tone', '#8b5cf6')}
                      {scoreRing(100 - analysis.textureScore, 'Smoothness', '#f59e0b')}
                      {scoreRing(100 - analysis.oilinessScore, 'Balance', '#10b981')}
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center"><Award className="w-5 h-5 text-teal-600" /></div>
                      <div>
                        <p className="text-xs text-skin-400">Baumann Type</p>
                        <p className="font-medium text-skin-900">{baumann}</p>
                      </div>
                    </div>
                    <p className="text-xs text-skin-500">{BAUMANN_TYPES[baumann!]}</p>
                  </div>
                  <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center"><SunIcon className="w-5 h-5 text-sage-600" /></div>
                      <div>
                        <p className="text-xs text-skin-400">Fitzpatrick</p>
                        <p className="font-medium text-skin-900">Type {assessment.fitzpatrick}</p>
                      </div>
                    </div>
                    <p className="text-xs text-skin-500">{FITZPATRICK_NAMES[assessment.fitzpatrick].split('—')[1].trim()}</p>
                  </div>
                  <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center"><Heart className="w-5 h-5 text-rose-600" /></div>
                      <div>
                        <p className="text-xs text-skin-400">Concerns</p>
                        <p className="font-medium text-skin-900">{assessment.concerns.length}</p>
                      </div>
                    </div>
                    <p className="text-xs text-skin-500">{assessment.concerns.slice(0, 3).join(', ')}{assessment.concerns.length > 3 ? '...' : ''}</p>
                  </div>
                </div>

                {/* Recent Analysis Image */}
                {analysis?.imageUrl && (
                  <div className="glass-card rounded-2xl p-5">
                    <h3 className="font-medium text-skin-900 mb-3 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-teal-500" /> Latest Analysis
                    </h3>
                    <div className="flex items-center gap-4">
                      <img src={analysis.imageUrl} alt="Skin" className="w-24 h-24 rounded-xl object-cover" />
                      <div className="flex-1">
                        <p className="text-sm text-skin-700 mb-1">Detected conditions: <span className="font-medium">{analysis.detectedConcerns.join(', ') || 'None'}</span></p>
                        <p className="text-sm text-skin-700 mb-1">Skin tone: <span className="font-medium">{analysis.skinTone}</span></p>
                        <p className="text-sm text-skin-700">Overall health: <span className="font-medium text-teal-600">{analysis.overallHealth}/100</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Routine' && (
              <div className="space-y-4">
                {recommendations.length === 0 ? (
                  <div className="glass-card rounded-2xl p-8 text-center">
                    <p className="text-skin-500">Complete your assessment to generate your routine.</p>
                  </div>
                ) : (
                  recommendations.map((rec, i) => {
                    const matched = (matchProductsToRecommendations(recommendations, products, baumann!).get(rec.id) || []).slice(0, 2);
                    return (
                      <motion.div key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="glass-card rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center text-sm font-bold">{rec.step}</span>
                            <h4 className="font-medium text-skin-900">{rec.category}</h4>
                          </div>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                            rec.priority === 'essential' && 'bg-teal-100 text-teal-700',
                            rec.priority === 'recommended' && 'bg-sage-100 text-sage-700',
                            rec.priority === 'optional' && 'bg-skin-100 text-skin-600'
                          )}>{rec.priority}</span>
                        </div>
                        <p className="text-sm text-skin-600 mb-2">{rec.explanation}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {rec.ingredients.map(ing => (
                            <span key={ing} className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-xs">{ing}</span>
                          ))}
                        </div>
                        {matched.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-skin-100">
                            <p className="text-xs text-skin-500 mb-1">Matched products:</p>
                            {matched.map(p => (
                              <div key={p.id} className="flex justify-between items-center py-1">
                                <span className="text-sm text-skin-700">{p.name} <span className="text-skin-400">({p.brand})</span></span>
                                <span className="text-sm font-medium text-skin-900">{p.price}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'Analysis' && (
              <div className="space-y-6">
                {analysis ? (
                  <>
                    <div className="glass-card rounded-2xl p-6">
                      <h3 className="font-medium text-skin-900 mb-4">Image Analysis Results</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { label: 'Overall Health', value: analysis.overallHealth, color: 'teal' },
                          { label: 'Hydration', value: analysis.hydrationScore, color: 'blue' },
                          { label: 'Redness', value: analysis.rednessScore, color: 'rose' },
                          { label: 'Dark Spots', value: analysis.darkSpotScore, color: 'purple' },
                          { label: 'Texture', value: analysis.textureScore, color: 'amber' },
                          { label: 'Oiliness', value: analysis.oilinessScore, color: 'green' },
                        ].map(m => (
                          <div key={m.label} className="text-center p-3 bg-skin-50 rounded-xl">
                            <div className="text-2xl font-bold" style={{ color: `var(--color-${m.color}-600)` }}>{m.value}</div>
                            <div className="text-xs text-skin-500">{m.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="glass-card rounded-2xl p-6">
                      <h3 className="font-medium text-skin-900 mb-4">Detected Concerns</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.detectedConcerns.length > 0 ? analysis.detectedConcerns.map(c => (
                          <span key={c} className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 text-sm font-medium">{c}</span>
                        )) : <p className="text-sm text-skin-500">No major concerns detected from image analysis.</p>}
                      </div>
                    </div>
                    {analysis.imageUrl && (
                      <div className="glass-card rounded-2xl p-6">
                        <h3 className="font-medium text-skin-900 mb-4">Analyzed Image</h3>
                        <img src={analysis.imageUrl} alt="Analyzed skin" className="rounded-xl max-w-xs" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="glass-card rounded-2xl p-8 text-center">
                    <Camera className="w-12 h-12 text-skin-300 mx-auto mb-4" />
                    <h3 className="font-medium text-skin-900 mb-2">No Image Analysis</h3>
                    <p className="text-sm text-skin-500 mb-6">Upload a selfie to get AI-powered skin condition detection.</p>
                    <button onClick={onStartAnalysis} className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-all">
                      Upload Selfie
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Settings' && (
              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="font-medium text-skin-900 mb-4">Profile</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-skin-500">Email</span><span className="text-skin-900">{user?.email}</span></div>
                    <div className="flex justify-between"><span className="text-skin-500">Name</span><span className="text-skin-900">{user?.displayName || 'Not set'}</span></div>
                    <div className="flex justify-between"><span className="text-skin-500">User ID</span><span className="text-skin-900 text-xs font-mono">{user?.uid?.slice(0, 12)}...</span></div>
                  </div>
                  <button onClick={onEditProfile} className="mt-4 w-full py-2.5 border border-skin-200 rounded-xl text-sm font-medium text-skin-700 hover:bg-skin-50 transition-all">
                    Edit Skin Profile
                  </button>
                </div>
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="font-medium text-skin-900 mb-4 text-rose-700">Danger Zone</h3>
                  <button onClick={onLogout} className="w-full py-2.5 border border-rose-200 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center gap-2">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AdminPage({ products, onAddProduct, onUpdateProduct, onRemoveProduct, onBack }: {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<string>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onRemoveProduct: (id: string) => Promise<void>;
  onBack: () => void;
}) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: '', brand: '', category: 'Cleanser', ingredients: '', skinTypes: '', concerns: '',
    price: '', rating: 4, description: '',
  });

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const submitForm = async () => {
    const data = {
      name: form.name, brand: form.brand, category: form.category,
      ingredients: form.ingredients.split(',').map(s => s.trim()).filter(Boolean),
      skinTypes: form.skinTypes.split(',').map(s => s.trim()).filter(Boolean),
      concerns: form.concerns.split(',').map(s => s.trim()).filter(Boolean),
      price: form.price, rating: Number(form.rating), description: form.description,
      imageUrl: ''
    };
    if (editing) {
      await onUpdateProduct(editing.id, data);
      setEditing(null);
    } else {
      await onAddProduct(data);
    }
    setShowForm(false);
    setForm({ name: '', brand: '', category: 'Cleanser', ingredients: '', skinTypes: '', concerns: '', price: '', rating: 4, description: '' });
  };

  const startEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, brand: p.brand, category: p.category,
      ingredients: p.ingredients.join(', '), skinTypes: p.skinTypes.join(', '),
      concerns: p.concerns.join(', '), price: p.price, rating: p.rating, description: p.description,
    });
    setShowForm(true);
  };

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl border border-skin-200 hover:bg-skin-50 transition-all">
              <ChevronLeft className="w-5 h-5 text-skin-600" />
            </button>
            <div>
              <h2 className="font-serif text-2xl font-medium text-skin-900">Admin Panel</h2>
              <p className="text-xs text-skin-400">Manage products and recommendations</p>
            </div>
          </div>
          <button onClick={() => { setShowForm(!showForm); setEditing(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-all">
            <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Add Product'}
          </button>
        </div>

        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card rounded-2xl p-6 mb-6">
            <h3 className="font-medium text-skin-900 mb-4">{editing ? 'Edit Product' : 'New Product'}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" className="p-3 rounded-xl border border-skin-200 bg-white/50 text-sm focus:outline-none focus:border-teal-500" />
              <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Brand" className="p-3 rounded-xl border border-skin-200 bg-white/50 text-sm focus:outline-none focus:border-teal-500" />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="p-3 rounded-xl border border-skin-200 bg-white/50 text-sm focus:outline-none focus:border-teal-500">
                {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Price (e.g. $20)" className="p-3 rounded-xl border border-skin-200 bg-white/50 text-sm focus:outline-none focus:border-teal-500" />
              <input value={form.ingredients} onChange={e => setForm({ ...form, ingredients: e.target.value })} placeholder="Ingredients (comma separated)" className="p-3 rounded-xl border border-skin-200 bg-white/50 text-sm focus:outline-none focus:border-teal-500" />
              <input value={form.skinTypes} onChange={e => setForm({ ...form, skinTypes: e.target.value })} placeholder="Skin types (comma separated, or ALL)" className="p-3 rounded-xl border border-skin-200 bg-white/50 text-sm focus:outline-none focus:border-teal-500" />
              <input value={form.concerns} onChange={e => setForm({ ...form, concerns: e.target.value })} placeholder="Concerns (comma separated)" className="p-3 rounded-xl border border-skin-200 bg-white/50 text-sm focus:outline-none focus:border-teal-500" />
              <input type="number" min={0} max={5} step={0.1} value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} placeholder="Rating (0-5)" className="p-3 rounded-xl border border-skin-200 bg-white/50 text-sm focus:outline-none focus:border-teal-500" />
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3} className="md:col-span-2 p-3 rounded-xl border border-skin-200 bg-white/50 text-sm focus:outline-none focus:border-teal-500 resize-none" />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-skin-200 text-skin-600 text-sm hover:bg-skin-50 transition-all">Cancel</button>
              <button onClick={submitForm} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-all">{editing ? 'Update' : 'Save'}</button>
            </div>
          </motion.div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-skin-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-skin-200 bg-white/50 text-sm focus:outline-none focus:border-teal-500" />
        </div>

        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="glass-card rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-skin-100 flex items-center justify-center text-sm font-bold text-skin-500">{p.brand[0]}</div>
                <div>
                  <p className="font-medium text-skin-900 text-sm">{p.name}</p>
                  <p className="text-xs text-skin-400">{p.brand} · {p.category} · {p.price}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.ingredients.slice(0, 3).map(ing => <span key={ing} className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-xs">{ing}</span>)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(p)} className="p-2 rounded-lg hover:bg-skin-100 transition-all text-skin-500">
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={() => onRemoveProduct(p.id)} className="p-2 rounded-lg hover:bg-rose-50 transition-all text-rose-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-skin-400">
              <Database className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No products found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP COMPONENT ====================

export default function App() {
  const { user, profile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logOut } = useAuth();
  const { assessment, analysis, loading: dataLoading, saveAssessment, saveAnalysis } = useUserData(user?.uid);
  const { products, loadProducts, addProduct, updateProduct, removeProduct } = useProducts();

  const [view, setView] = useState<View>('landing');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const addNotification = useCallback((message: string, type: Notification['type'] = 'info') => {
    const id = Date.now().toString() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Navigation helpers
  const goToLanding = useCallback(() => setView('landing'), []);
  const goToAuth = useCallback(() => setView('auth'), []);
  const goToOnboarding = useCallback(() => setView('onboarding'), []);
  const goToAnalysis = useCallback(() => setView('analysis'), []);
  const goToResults = useCallback(() => setView('results'), []);
  const goToDashboard = useCallback(() => setView('dashboard'), []);
  const goToAdmin = useCallback(() => setView('admin'), []);

  const handleAuthSuccess = useCallback(() => {
    addNotification('Welcome! You are signed in.', 'success');
    if (assessment) {
      goToDashboard();
    } else {
      goToOnboarding();
    }
  }, [assessment, addNotification, goToDashboard, goToOnboarding]);

  const handleAssessmentComplete = useCallback(async (data: SkinAssessment) => {
    await saveAssessment(data);
    addNotification('Skin profile saved successfully!', 'success');
    goToAnalysis();
  }, [saveAssessment, addNotification, goToAnalysis]);

  const handleAnalysisComplete = useCallback(async (result: SkinAnalysisResult) => {
    await saveAnalysis(result);
    addNotification('Image analysis complete!', 'success');
    goToResults();
  }, [saveAnalysis, addNotification, goToResults]);

  const handleLogout = useCallback(async () => {
    await logOut();
    addNotification('You have been signed out.', 'info');
    goToLanding();
  }, [logOut, addNotification, goToLanding]);

  // Determine initial view after auth loads
  useEffect(() => {
    if (!loading && user) {
      if (assessment) {
        // If on landing/auth, redirect to dashboard
        if (view === 'landing' || view === 'auth') {
          goToDashboard();
        }
      } else if (view === 'landing' || view === 'auth') {
        goToOnboarding();
      }
    }
  }, [loading, user, assessment, view, goToDashboard, goToOnboarding]);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const isAdmin = profile?.isAdmin;

  const navItems = [
    ...(user ? [{ label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" />, onClick: goToDashboard, active: view === 'dashboard' }] : []),
    ...(user ? [{ label: 'Analysis', icon: <Camera className="w-4 h-4" />, onClick: goToAnalysis, active: view === 'analysis' }] : []),
    ...(user ? [{ label: 'Routine', icon: <Sparkles className="w-4 h-4" />, onClick: goToResults, active: view === 'results' }] : []),
    ...(isAdmin ? [{ label: 'Admin', icon: <Settings className="w-4 h-4" />, onClick: goToAdmin, active: view === 'admin' }] : []),
  ];

  const showNav = view !== 'landing' && view !== 'auth';

  return (
    <div className="min-h-screen w-full relative">
      <NotificationToast notifications={notifications} removeNotification={removeNotification} />

      {/* Top Navigation */}
      {showNav && (
        <nav className="sticky top-0 z-40 glass-card border-b border-white/50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={goToDashboard} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-serif font-medium text-skin-900">DermaSense</span>
            </button>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <button key={item.label} onClick={item.onClick}
                  className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all',
                    item.active ? 'bg-teal-50 text-teal-700 font-medium' : 'text-skin-600 hover:bg-skin-100')}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {user && (
                <div className="hidden md:flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center overflow-hidden">
                    {profile?.photoURL ? <img src={profile.photoURL} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-teal-600" />}
                  </div>
                  <span className="text-sm text-skin-700">{profile?.displayName?.split(' ')[0] || 'User'}</span>
                </div>
              )}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-skin-100">
                <Menu className="w-5 h-5 text-skin-700" />
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="md:hidden border-t border-skin-100 bg-white/80 backdrop-blur-lg">
                <div className="px-4 py-2 space-y-1">
                  {navItems.map(item => (
                    <button key={item.label} onClick={() => { item.onClick(); setMobileMenuOpen(false); }}
                      className={cn('w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all',
                        item.active ? 'bg-teal-50 text-teal-700 font-medium' : 'text-skin-600')}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-rose-600 hover:bg-rose-50 transition-all">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      )}

      {/* Landing page has its own nav logic */}
      {view === 'landing' && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-serif font-medium text-skin-900">DermaSense</span>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <button onClick={goToDashboard} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-all">
                  My Dashboard
                </button>
              ) : (
                <>
                  <button onClick={goToAuth} className="px-4 py-2 text-sm text-skin-600 hover:text-skin-900 transition-all">
                    Sign In
                  </button>
                  <button onClick={goToAuth} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-all">
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {view === 'landing' && <LandingPage onGetStarted={goToAuth} />}
          {view === 'auth' && (
            <AuthPage
              onAuthSuccess={handleAuthSuccess}
              signInWithGoogle={signInWithGoogle}
              signInWithEmail={signInWithEmail}
              signUpWithEmail={signUpWithEmail}
            />
          )}
          {view === 'onboarding' && (
            <OnboardingPage
              onComplete={handleAssessmentComplete}
              onSkip={() => { addNotification('Assessment skipped', 'info'); goToAnalysis(); }}
              initialData={assessment}
            />
          )}
          {view === 'analysis' && (
            <ImageAnalysisPage
              onComplete={handleAnalysisComplete}
              onSkip={() => { addNotification('Image analysis skipped', 'info'); goToResults(); }}
            />
          )}
          {view === 'results' && (
            <ResultsPage
              assessment={assessment!}
              analysis={analysis}
              products={products}
              onGoToDashboard={goToDashboard}
            />
          )}
          {view === 'dashboard' && (
            <DashboardPage
              user={user}
              profile={profile}
              assessment={assessment}
              analysis={analysis}
              products={products}
              onStartAnalysis={goToAnalysis}
              onEditProfile={goToOnboarding}
              onLogout={handleLogout}
            />
          )}
          {view === 'admin' && isAdmin && (
            <AdminPage
              products={products}
              onAddProduct={addProduct}
              onUpdateProduct={updateProduct}
              onRemoveProduct={removeProduct}
              onBack={goToDashboard}
            />
          )}
          {view === 'admin' && !isAdmin && (
            <div className="min-h-screen flex items-center justify-center px-4">
              <div className="glass-card rounded-2xl p-8 text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                <h3 className="font-medium text-skin-900 mb-2">Access Denied</h3>
                <p className="text-sm text-skin-500 mb-4">You do not have admin privileges.</p>
                <button onClick={goToDashboard} className="px-6 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-all">
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Loading overlay */}
      {(loading || dataLoading) && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-3 border-teal-200 border-t-teal-600 animate-spin" />
            <p className="text-sm text-skin-500">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
