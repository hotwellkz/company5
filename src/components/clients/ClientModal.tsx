import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ClientForm } from './ClientForm';
import { NewClient } from '../../types/client';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, addCategory } from '../../lib/firebase';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: NewClient;
  isEditMode?: boolean;
  yearOptions: number[];
  onSave: () => void;
  generateClientNumber: (year: number, category: 'deposit' | 'building' | 'completed') => Promise<string>;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  client: initialClient,
  isEditMode = false,
  yearOptions,
  onSave,
  generateClientNumber
}) => {
  const [client, setClient] = useState<NewClient>({
    ...initialClient,
    category: initialClient.category || 'deposit'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initializeClientNumber = async () => {
      if (!isEditMode) {
        try {
          const newClientNumber = await generateClientNumber(client.year, client.category);
          setClient(prev => ({ ...prev, clientNumber: newClientNumber }));
        } catch (error) {
          console.error('Error generating client number:', error);
        }
      }
    };

    initializeClientNumber();
  }, [client.year, client.category, isEditMode, generateClientNumber]);

  const handleChange = (updates: Partial<NewClient>) => {
    setClient(prev => {
      const newClient = { ...prev, ...updates };
      
      // Если изменилась категория, генерируем новый номер
      if (updates.category && updates.category !== prev.category) {
        generateClientNumber(newClient.year, newClient.category)
          .then(newNumber => {
            setClient(current => ({ ...current, clientNumber: newNumber }));
          })
          .catch(console.error);
      }
      
      return newClient;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const clientData = {
        ...client,
        createdAt: serverTimestamp(),
        category: client.category || 'deposit'
      };

      if (isEditMode && initialClient.id) {
        const clientRef = doc(db, 'clients', initialClient.id);
        await updateDoc(clientRef, clientData);
      } else {
        // Создаем нового клиента
        const clientRef = await addDoc(collection(db, 'clients'), clientData);
        
        // Создаем категорию в проектах для нового клиента, если не скрыта
        if (!client.hideProjectIcon) {
          await addCategory({
            title: `${client.lastName} ${client.firstName}`,
            amount: '0 ₸',
            icon: 'Building2',
            color: 'bg-blue-500',
            row: 3
          });
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Ошибка при сохранении данных клиента');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-lg border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {isEditMode ? 'Редактировать клиента' : 'Добавить клиента'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <ClientForm
            client={client}
            onChange={handleChange}
            yearOptions={yearOptions}
            isEditMode={isEditMode}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors"
            >
              {loading ? 'Сохранение...' : (isEditMode ? 'Сохранить' : 'Добавить')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};