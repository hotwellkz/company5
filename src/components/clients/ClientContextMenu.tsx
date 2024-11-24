import React, { useEffect, useRef } from 'react';
import { Edit2, Trash2, ArrowRight, Wallet, Building2, CheckSquare } from 'lucide-react';

interface ClientContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (category: 'deposit' | 'building' | 'completed') => void;
  clientName: string;
  currentCategory: 'deposit' | 'building' | 'completed';
}

const categoryConfig = {
  deposit: {
    label: 'Задаток',
    icon: Wallet,
    color: 'text-amber-600',
    bgHover: 'hover:bg-amber-50'
  },
  building: {
    label: 'Строим',
    icon: Building2,
    color: 'text-emerald-600',
    bgHover: 'hover:bg-emerald-50'
  },
  completed: {
    label: 'Построено',
    icon: CheckSquare,
    color: 'text-blue-600',
    bgHover: 'hover:bg-blue-50'
  }
} as const;

export const ClientContextMenu: React.FC<ClientContextMenuProps> = ({
  position,
  onClose,
  onEdit,
  onDelete,
  onMove,
  clientName,
  currentCategory
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Вычисляем позицию меню с учетом границ экрана
  const menuStyle = (() => {
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 50
    };

    // Учитываем правую границу экрана
    if (position.x + 240 > window.innerWidth) {
      style.right = `${window.innerWidth - position.x}px`;
    } else {
      style.left = `${position.x}px`;
    }

    // Учитываем нижнюю границу экрана
    if (position.y + 300 > window.innerHeight) {
      style.bottom = `${window.innerHeight - position.y}px`;
    } else {
      style.top = `${position.y}px`;
    }

    return style;
  })();

  const CurrentIcon = categoryConfig[currentCategory].icon;

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg py-1 min-w-[240px]"
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-2">
        <CurrentIcon className={`w-4 h-4 ${categoryConfig[currentCategory].color}`} />
        <span className="font-medium text-gray-900">{clientName}</span>
      </div>

      <div className="py-1">
        <button
          onClick={onEdit}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Редактировать
        </button>
      </div>

      <div className="py-1 border-t border-gray-200">
        {Object.entries(categoryConfig).map(([category, config]) => {
          if (category === currentCategory) return null;
          const Icon = config.icon;
          return (
            <button
              key={category}
              onClick={() => onMove(category as keyof typeof categoryConfig)}
              className={`w-full px-4 py-2 text-left text-sm ${config.color} ${config.bgHover} flex items-center gap-2`}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">Перевести в "{config.label}"</span>
              <ArrowRight className="w-4 h-4 opacity-50" />
            </button>
          );
        })}
      </div>

      <div className="py-1 border-t border-gray-200">
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Удалить
        </button>
      </div>
    </div>
  );
};