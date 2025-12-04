import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fournisseurAPI, boutiqueAPI } from '../api';
import {
  ArrowLeft, Search, Plus, Store, Trash2, Edit2,
  User, Phone, Mail, MapPin, Truck, Home, ShoppingCart,
  Package, Users, Loader, CheckCircle, AlertCircle, Info, X
} from 'lucide-react';

export default function Fournisseur({ isOnline }) {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState(null);

  const [formData, setFormData] = useState({
    nom: '',
    contact: '',
    telephone: '',
    email: '',
    adresse: '',
    boutique: ''
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [isOnline, searchTerm]);

  const loadData = async () => {
    if (!isOnline) {
      showMessage('Mode hors ligne - Fonctionnalité limitée', 'warning');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const [fournisseursRes, boutiquesRes] = await Promise.all([
        fournisseurAPI.list({ params }),
        boutiqueAPI.list()
      ]);
      setFournisseurs(fournisseursRes.data.results || fournisseursRes.data);
      const boutiquesData = boutiquesRes.data.results || boutiquesRes.data;
      setBoutiques(boutiquesData);

      if (boutiquesData.length > 0 && !formData.boutique) {
        setFormData(prev => ({ ...prev, boutique: boutiquesData[0].id }));
      }
    } catch (error) {
      console.error('Erreur chargement fournisseurs:', error);
      showMessage('Erreur lors du chargement', 'error');
    }
    setLoading(false);
  };

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isOnline) {
      showMessage('Connexion Internet requise', 'error');
      return;
    }

    try {
      if (editingFournisseur) {
        await fournisseurAPI.update(editingFournisseur.id, formData);
        showMessage('✅ Fournisseur mis à jour avec succès');
      } else {
        await fournisseurAPI.create(formData);
        showMessage('✅ Fournisseur créé avec succès');
        setSearchTerm('');
      }

      handleCancelForm();
      await loadData();
    } catch (error) {
      console.error('Erreur sauvegarde fournisseur:', error);
      showMessage('❌ Erreur: ' + (error.response?.data?.message || error.message), 'error');
    }
  };

  const handleEdit = (fournisseur) => {
    setEditingFournisseur(fournisseur);
    setFormData({
      nom: fournisseur.nom,
      contact: fournisseur.contact || '',
      telephone: fournisseur.telephone || '',
      email: fournisseur.email || '',
      adresse: fournisseur.adresse || '',
      boutique: fournisseur.boutique
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;

    if (!isOnline) {
      showMessage('Connexion Internet requise', 'error');
      return;
    }

    try {
      await fournisseurAPI.delete(id);
      showMessage('✅ Fournisseur supprimé');
      await loadData();
    } catch (error) {
      showMessage('❌ Erreur lors de la suppression', 'error');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingFournisseur(null);
    setFormData({
      nom: '',
      contact: '',
      telephone: '',
      email: '',
      adresse: '',
      boutique: boutiques.length > 0 ? boutiques[0].id : ''
    });
  };

  const filteredFournisseurs = useMemo(() => {
    if (isOnline) return fournisseurs;
    return fournisseurs.filter(f =>
      f.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.contact && f.contact.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.telephone && f.telephone.includes(searchTerm)) ||
      (f.email && f.email.includes(searchTerm))
    );
  }, [fournisseurs, searchTerm, isOnline]);

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn"><ArrowLeft size={20} /><span>Retour</span></Link>
          <div className="title-block">
            <h1>Fournisseurs</h1>
            <p className="subtitle">{filteredFournisseurs.length} partenaires</p>
          </div>
        </div>
        <div className="header-right">
          {isOnline && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={18} /> Nouveau
            </button>
          )}
        </div>
      </header>

      <div className="content-wrapper">

        {message && (
          <div className={`alert-box ${messageType}`}>
             {messageType === 'error' ? <AlertCircle size={20}/> : messageType === 'info' ? <Info size={20}/> : <CheckCircle size={20}/>}
             <span>{message}</span>
          </div>
        )}

        <div className="search-section">
          <div className="input-wrapper search">
             <Search size={18} className="input-icon" />
             <input
               type="text"
               placeholder="Rechercher (nom, contact, téléphone, email)..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               disabled={loading}
             />
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><Loader className="spin" size={32} /><p>Chargement...</p></div>
        ) : filteredFournisseurs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Truck size={40} /></div>
            <h3>Aucun fournisseur trouvé</h3>
            <p>{searchTerm ? 'Essayez un autre terme de recherche' : 'Ajoutez vos fournisseurs pour gérer vos approvisionnements'}</p>
          </div>
        ) : (
          <div className="grid-container">
            {filteredFournisseurs.map(fournisseur => (
              <div key={fournisseur.id} className="card">
                <div className="card-header">
                  <div className="avatar-placeholder">{fournisseur.nom.charAt(0).toUpperCase()}</div>
                  <div className="card-title-block">
                    <h3>{fournisseur.nom}</h3>
                    {fournisseur.contact && <span className="contact-badge"><User size={10} /> {fournisseur.contact}</span>}
                  </div>
                  {isOnline && (
                    <div className="card-actions">
                      <button onClick={() => handleEdit(fournisseur)} className="btn-icon edit" title="Modifier"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(fournisseur.id)} className="btn-icon delete" title="Supprimer"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>

                <div className="card-body">
                  {fournisseur.telephone && (
                    <div className="info-row">
                      <Phone size={14} />
                      <a href={`tel:${fournisseur.telephone}`}>{fournisseur.telephone}</a>
                    </div>
                  )}
                  {fournisseur.email && (
                    <div className="info-row">
                      <Mail size={14} />
                      <a href={`mailto:${fournisseur.email}`}>{fournisseur.email}</a>
                    </div>
                  )}
                  {fournisseur.adresse && (
                    <div className="info-row">
                      <MapPin size={14} />
                      <span>{fournisseur.adresse}</span>
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <small>Ajouté le {new Date(fournisseur.created_at).toLocaleDateString('fr-FR')}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL FORMULAIRE */}
      {showForm && (
        <div className="modal-backdrop" onClick={handleCancelForm}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingFournisseur ? 'Modifier le fournisseur' : 'Nouveau Fournisseur'}</h2>
              <button className="close-btn" onClick={handleCancelForm}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Nom de l'entreprise *</label>
                <div className="input-wrapper">
                  <Truck size={18} className="input-icon" />
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    placeholder="Ex: Société Import Export"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Personne de contact</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="Ex: M. Jean Dupont"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Téléphone *</label>
                  <div className="input-wrapper">
                    <Phone size={18} className="input-icon" />
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      required
                      placeholder="+242..."
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@..."
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Adresse</label>
                <div className="input-wrapper">
                  <MapPin size={18} className="input-icon" />
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="Adresse complète"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Boutique associée *</label>
                <div className="input-wrapper">
                  <Store size={18} className="input-icon" />
                  <select
                    value={formData.boutique}
                    onChange={(e) => setFormData({ ...formData, boutique: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner une boutique</option>
                    {boutiques.map(b => (
                      <option key={b.id} value={b.id}>{b.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={handleCancelForm} className="btn-cancel">Annuler</button>
                <button type="submit" className="btn-submit">{editingFournisseur ? 'Mettre à jour' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <Link to="/dashboard" className="nav-item"><Home size={20} /><span>Accueil</span></Link>
        <Link to="/ventes" className="nav-item"><ShoppingCart size={20} /><span>Ventes</span></Link>
        <Link to="/produits" className="nav-item"><Package size={20} /><span>Produits</span></Link>
        <Link to="/clients" className="nav-item"><Users size={20} /><span>Clients</span></Link>
      </nav>

      <style jsx>{`
        .page-container { min-height: 100vh; background-color: #f8fafc; color: #1e293b; font-family: 'Inter', sans-serif; padding-bottom: 90px; }

        /* HEADER */
        .page-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 20; }
        .header-left { display: flex; align-items: center; gap: 24px; }
        .back-btn { display: flex; align-items: center; gap: 8px; color: #64748b; text-decoration: none; font-weight: 500; padding: 8px 12px; border-radius: 8px; transition: 0.2s; }
        .back-btn:hover { background: #f1f5f9; color: #1e293b; }
        .title-block h1 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #0f172a; }
        .subtitle { margin: 4px 0 0; font-size: 0.85rem; color: #64748b; }
        .btn-primary { background: #4f46e5; color: white; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; }
        .btn-primary:hover { background: #4338ca; }

        .content-wrapper { max-width: 1200px; margin: 30px auto; padding: 0 20px; }

        /* RECHERCHE */
        .search-section { margin-bottom: 24px; }
        .input-wrapper.search input { width: 100%; padding: 14px 14px 14px 44px; font-size: 1rem; border-radius: 12px; }

        /* GRID CARDS */
        .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .card { background: white; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -2px rgba(0,0,0,0.03); overflow: hidden; transition: transform 0.2s; }
        .card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }

        .card-header { padding: 20px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #f1f5f9; background: linear-gradient(to right, #ffffff, #f8fafc); }
        .avatar-placeholder { width: 48px; height: 48px; background: #e0e7ff; color: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; flex-shrink: 0; }
        .card-title-block { flex: 1; min-width: 0; }
        .card-title-block h3 { margin: 0 0 4px 0; font-size: 1.1rem; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .contact-badge { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #64748b; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; width: fit-content; }

        .card-actions { display: flex; gap: 8px; }
        .btn-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: none; cursor: pointer; transition: 0.2s; }
        .btn-icon.edit { background: #eff6ff; color: #3b82f6; }
        .btn-icon.edit:hover { background: #3b82f6; color: white; }
        .btn-icon.delete { background: #fef2f2; color: #ef4444; }
        .btn-icon.delete:hover { background: #ef4444; color: white; }

        .card-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
        .info-row { display: flex; align-items: center; gap: 10px; color: #64748b; font-size: 0.9rem; }
        .info-row svg { color: #94a3b8; }
        .info-row a { color: #4f46e5; text-decoration: none; font-weight: 500; }
        .info-row a:hover { text-decoration: underline; }

        .card-footer { padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8; text-align: right; }

        /* EMPTY & LOADING */
        .empty-state { text-align: center; padding: 60px 20px; color: #64748b; background: white; border-radius: 16px; border: 1px dashed #e2e8f0; }
        .empty-icon { width: 64px; height: 64px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #94a3b8; }
        .loading-state { text-align: center; padding: 40px; color: #64748b; }
        .spin { animation: spin 1s linear infinite; }

        /* MODAL & FORMS */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; animation: fadeIn 0.2s; }
        .modal-card { background: white; width: 100%; max-width: 500px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); margin: 20px; }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .modal-header h2 { margin: 0; font-size: 1.25rem; color: #1e293b; }
        .close-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; transition: 0.2s; }
        .close-btn:hover { color: #ef4444; }

        .modal-body { padding: 24px; }
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-icon { position: absolute; left: 14px; color: #94a3b8; pointer-events: none; }
        .input-wrapper input, .input-wrapper select { width: 100%; padding: 12px 14px 12px 40px; border: 1px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 0.95rem; color: #1e293b; background: white; appearance: none; }
        .input-wrapper input:focus, .input-wrapper select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; color: #64748b; font-size: 0.85rem; font-weight: 600; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .modal-footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; }
        .btn-cancel { padding: 10px 20px; border: 1px solid #e2e8f0; background: white; color: #64748b; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn-cancel:hover { background: #f1f5f9; color: #1e293b; }
        .btn-submit { padding: 10px 20px; border: none; background: #4f46e5; color: white; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn-submit:hover { background: #4338ca; }

        /* ALERTES */
        .alert-box { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-weight: 500; }
        .alert-box.success { background: #ecfdf5; color: #047857; border: 1px solid #d1fae5; }
        .alert-box.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; }
        .alert-box.info { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
        .alert-box.warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

        /* BOTTOM NAV */
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-around; padding: 12px 0; z-index: 100; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.02); }
        .nav-item { display: flex; flex-direction: column; align-items: center; text-decoration: none; color: #94a3b8; font-size: 0.75rem; font-weight: 500; gap: 4px; transition: 0.2s; }
        .nav-item.active { color: #4f46e5; }
        .nav-item:hover { color: #475569; }

        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        @media (max-width: 640px) {
          .page-header { flex-direction: column; align-items: flex-start; gap: 16px; padding: 16px; }
          .header-right { width: 100%; display: flex; justify-content: flex-end; }
          .grid-container { grid-template-columns: 1fr; }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}