import {
  Home, ArrowLeftRight, Wallet, PieChart, BarChart3, PiggyBank, TrendingUp,
  Calculator, Tag, Bell, Settings, Plus, Search, Menu, X, ChevronRight,
  ChevronLeft, ChevronDown, ArrowUp, ArrowDown, ArrowRight, Check, Eye, EyeOff,
  Filter, Moon, Sun, Target, Calendar, Upload, Download, Trash2, User, Users,
  Sparkles, Info, Pencil, Star, Coins, Gift, LogOut, UsersRound, Heart, BookOpen, Crown,
} from 'lucide-react'

const MAP = {
  home: Home, swap: ArrowLeftRight, wallet: Wallet, pie: PieChart, chart: BarChart3,
  pig: PiggyBank, trending: TrendingUp, calc: Calculator, tag: Tag, bell: Bell,
  settings: Settings, plus: Plus, search: Search, menu: Menu, x: X,
  chevronR: ChevronRight, chevronL: ChevronLeft, chevronD: ChevronDown,
  arrowUp: ArrowUp, arrowDown: ArrowDown, arrowR: ArrowRight, check: Check,
  eye: Eye, eyeOff: EyeOff, filter: Filter, moon: Moon, sun: Sun, target: Target,
  calendar: Calendar, upload: Upload, download: Download, trash: Trash2, user: User,
  users: Users, sparkles: Sparkles, info: Info, pencil: Pencil, star: Star,
  coin: Coins, gift: Gift, logout: LogOut, family: UsersRound, heart: Heart,
  book: BookOpen, crown: Crown,
}

export function Icon({ name, size = 20, stroke, strokeWidth, className, style }) {
  const C = MAP[name]
  if (!C) return null
  const width = stroke ?? strokeWidth ?? 1.75
  return <C size={size} strokeWidth={width} className={className} style={style} aria-hidden="true" />
}
