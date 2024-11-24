import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Filter } from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, deleteDoc, where, updateDoc } from 'firebase/firestore';
import { db, deleteClientContracts } from '../lib/firebase';
import { ClientContextMenu } from '../components/ClientContextMenu';
import { Client, NewClient, initialClientState } from '../types/client';
import { ClientList } from '../components/clients/ClientList';
import { ClientModal } from '../components/clients/ClientModal';
import { ClientPage } from './ClientPage';
import { DeleteConfirmationModal } from '../components/clients/DeleteConfirmationModal';

type CategoryFilter = 'all' | 'deposit' | 'building' | 'completed';

const categoryLabels = {
  all: 'Все',
  deposit: 'Задаток',
  building: 'Строим',
  completed: 'Построено'
};

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<NewClient>(initialClientState);
  const [showClientPage, setShowClientPage] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i);

  const fetchClients = async () => {
    try {
      const q = query(collection(db, 'clients'));
      const snapshot = await getDocs(q);
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];
      setClients(clientsData);
      return clientsData;
    } catch (error) {
      console.error('Error fetching clients:', error);
      alert('Ошибка при загрузке списка клиентов');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const generateClientNumber = async (year: number, category: 'deposit' | 'building' | 'completed') => {
    try {
      const q = query(
        collection(db, 'clients'),
        where('year', '==', year),
        where('category', '==', category)
      );
      
      const snapshot = await getDocs(q);
      let maxNumber = 0;

      snapshot.forEach(doc => {
        const clientData = doc.data();
        const currentNumber = parseInt(clientData.clientNumber.split('-')[1]);
        if (currentNumber > maxNumber) {
          maxNumber = currentNumber;
        }
      });

      const nextNumber = maxNumber + 1;
      return `${year}-${String(nextNumber).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating client number:', error);
      throw error;
    }
  };

  const filteredClients = clients.filter(client => {
    const yearMatch = client.year === selectedYear;
    const categoryMatch = categoryFilter === 'all' || client.category === categoryFilter;
    return yearMatch && categoryMatch;
  });

  const handleContextMenu = (e: React.MouseEvent, client: Client) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setSelectedClient(client);
    setShowContextMenu(true);
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setShowClientPage(true);
  };

  const handleEdit = () => {
    if (selectedClient) {
      setEditingClient({
        ...selectedClient
      });
      setShowEditModal(true);
      setShowContextMenu(false);
    }
  };

  const handleDelete = () => {
    setShowContextMenu(false);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedClient) return;

    try {
      // Удаляем договоры клиента
      await deleteClientContracts(selectedClient.id);
      
      // Удаляем категорию проекта
      const categoryQuery = query(
        collection(db, 'categories'),
        where('title', '==', `${selectedClient.lastName} ${selectedClient.firstName}`),
        where('row', '==', 3)
      );
      const categorySnapshot = await getDocs(categoryQuery);
      categorySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      // Удаляем самого клиента
      await deleteDoc(doc(db, 'clients', selectedClient.id));
      
      const updatedClients = await fetchClients();
      setClients(updatedClients);
      setShowDeleteModal(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Ошибка при удалении клиента');
    }
  };

  const handleMoveToCategory = async (category: 'deposit' | 'building' | 'completed') => {
    if (!selectedClient) return;

    try {
      // Генерируем новый номер для новой категории
      const newClientNumber = await generateClientNumber(selectedClient.year, category);
      
      const clientRef = doc(db, 'clients', selectedClient.id);
      await updateDoc(clientRef, { 
        category,
        clientNumber: newClientNumber // Обновляем номер клиента
      });
      
      const updatedClients = await fetchClients();
      setClients(updatedClients);
      setShowContextMenu(false);
    } catch (error) {
      console.error('Error moving client to category:', error);
      alert('Ошибка при изменении категории клиента');
    }
  };

  const handleClientSaved = async () => {
    const updatedClients = await fetchClients();
    setClients(updatedClients);
    setShowAddModal(false);
    setShowEditModal(false);
  };

  if (showClientPage && selectedClient) {
    return (
      <ClientPage
        client={selectedClient}
        onBack={() => setShowClientPage(false)}
        onSave={handleClientSaved}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" onClick={() => setShowContextMenu(false)}>
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button onClick={() => window.history.back()} className="mr-4">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">Клиенты</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors"
              >
                <Plus className="w-5 h-5 mr-1" />
                Добавить клиента
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Нет клиентов за {selectedYear} год</p>
          </div>
        ) : (
          <ClientList
            clients={filteredClients}
            onContextMenu={handleContextMenu}
            onClientClick={handleClientClick}
          />
        )}
      </div>

      {showContextMenu && selectedClient && (
        <ClientContextMenu
          position={contextMenuPosition}
          onClose={() => setShowContextMenu(false)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMove={handleMoveToCategory}
          clientName={`${selectedClient.lastName} ${selectedClient.firstName}`}
          currentCategory={selectedClient.category || 'deposit'}
        />
      )}

      {(showAddModal || showEditModal) && (
        <ClientModal
          isOpen={showAddModal || showEditModal}
          onClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
          }}
          client={showEditModal ? editingClient : initialClientState}
          isEditMode={showEditModal}
          yearOptions={yearOptions}
          onSave={handleClientSaved}
          generateClientNumber={generateClientNumber}
        />
      )}

      {showDeleteModal && selectedClient && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          clientName={`${selectedClient.lastName} ${selectedClient.firstName}`}
        />
      )}
    </div>
  );
};