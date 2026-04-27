import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronLeft, ChevronRight, Tag, MessageCircle, ShoppingCart, Trash2, Plus, Minus, Edit2, LogOut, LogIn, Search, Send, Home, Package, Zap, Clock, ShieldCheck, PenTool } from 'lucide-react';
import { collection, onSnapshot, getDocs, addDoc, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { db, auth } from './firebase';

const WHATSAPP_NUMBER = "5493513403129";

interface Product {
  id?: string;
  name: string;
  desc: string;
  price: string;
  originalPrice?: string;
  discountBadge?: string;
  img: string;
  images?: string[];
  category?: string;
}

interface CartItem extends Product {
  cartId: string;
  quantity: number;
}

const INITIAL_PRODUCTS: Product[] = [
  { name: 'Organizador de Escritorio Minimal', desc: 'Porta lápices y herramientas con diseño compacto. Ideal para escritorio o estudio.', price: '$50,000', img: 'Foto+Organizador', category: 'Oficina' },
  { name: 'Bandeja Organizadora "Wave"', desc: 'Bandeja multipropósito con compartimentos para accesorios, herramientas o PC.', price: '$50,000', img: 'Foto+Bandeja+Wave', category: 'Oficina' },
  { name: 'Colgante Arco Minimalista', desc: 'Diseño geométrico moderno, liviano y elegante. Diferentes colores disponibles.', price: '$50,000', img: 'Foto+Colgante', category: 'Accesorios' },
  { name: 'Figura Coleccionable Articulada', desc: 'Personaje con piezas móviles y gran detalle. Ideal para colección o decoración.', price: '$50,000', img: 'Foto+Figura', category: 'Coleccionables' },
  { name: 'Set de Ajedrez Impreso 3D', desc: 'Piezas completas + tablero. Perfecto para jugar o exhibir.', price: '$50,000', img: 'Foto+Ajedrez', category: 'Juegos' },
  { name: 'Soporte Articulado para Celular', desc: 'Brazo ajustable para sostener el teléfono en escritorio. Útil para grabar o contenido.', price: '$50,000', img: 'Foto+Soporte', category: 'Accesorios' },
];

const parseProductPrice = (priceVal: any) => {
  if (typeof priceVal === 'number') return priceVal;
  if (!priceVal) return 0;
  const numericStr = String(priceVal).replace(/[^0-9]/g, '');
  return parseInt(numericStr, 10) || 0;
};

const getDiscountPercent = (price: any, originalPrice: any) => {
  const p = parseProductPrice(price);
  const o = parseProductPrice(originalPrice);
  if (o > 0 && o > p) {
    return Math.round(((o - p) / o) * 100);
  }
  return 0;
};

function useSwipe({ onSwipedLeft, onSwipedRight }: { onSwipedLeft?: () => void, onSwipedRight?: () => void }) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && onSwipedLeft) onSwipedLeft();
    if (isRightSwipe && onSwipedRight) onSwipedRight();
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}

const ProductCard = React.memo(function ProductCard({ p, onClick, onAdd, userAdmin, onEdit, onDelete }: { p: Product; onClick: (p: Product) => void; onAdd: (p: Product) => void; userAdmin?: boolean; onEdit?: (p: Product) => void; onDelete?: (id: string) => void; }) {
  const images = Array.from(new Set([p.img, ...(p.images || [])])).filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(p);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1000);
  };

  const nextImage = (e?: React.MouseEvent | React.TouchEvent | React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setImgLoaded(false);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };
  const prevImage = (e?: React.MouseEvent | React.TouchEvent | React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setImgLoaded(false);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const swipeHandlers = useSwipe({
    onSwipedLeft: nextImage,
    onSwipedRight: prevImage
  });

  let currentImgSrc = images[currentIndex] || '';
  
  // Auto-fix Imgur page links to direct image links
  if (currentImgSrc.match(/^https?:\/\/(www\.)?imgur\.com\/[a-zA-Z0-9]+$/)) {
    currentImgSrc = currentImgSrc.replace('imgur.com', 'i.imgur.com') + '.jpg';
  }

  const displaySrc = currentImgSrc.startsWith('http') || currentImgSrc.startsWith('/') || currentImgSrc.startsWith('data:') 
    ? currentImgSrc 
    : `https://placehold.co/400x300/222/555?text=${encodeURIComponent(currentImgSrc)}`;

  return (
    <div 
      className="bg-[#0f1115] rounded-3xl overflow-hidden flex flex-col border border-white/5 hover:border-brand-accent/20 transition-all duration-500 ease-out hover:shadow-[0_20px_60px_-15px_rgba(0,255,136,0.15)] hover:-translate-y-2 cursor-pointer group"
      onClick={() => onClick(p)}
    >
      <div 
        className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#15181e] to-[#0a0c0f]"
        {...swipeHandlers}
      >
        
        {/* Subtle noise inside the card image area */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none z-10" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }} />

        {getDiscountPercent(p.price, p.originalPrice) > 0 && (
          <div className="absolute top-3 left-3 z-20 bg-brand-accent text-black text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-[0_2px_10px_rgba(0,255,136,0.3)] flex items-center gap-1">
            <Tag size={10} />
            {getDiscountPercent(p.price, p.originalPrice)}% OFF
          </div>
        )}
        {userAdmin && (
          <div className="absolute top-3 right-3 z-20 flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit && onEdit(p); }}
              className="bg-black/70 text-white p-2 rounded-full hover:bg-brand-accent hover:text-black transition-colors"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); p.id && onDelete && onDelete(p.id); }}
              className="bg-black/70 text-red-400 p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-white/5 animate-pulse" />
        )}
        <img 
          key={displaySrc}
          src={displaySrc} 
          alt={p.name} 
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 ${imgLoaded ? 'opacity-100' : 'opacity-0 scale-105'}`} 
          referrerPolicy="no-referrer" 
        />
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage} 
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-accent hover:text-black z-10"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={nextImage} 
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-accent hover:text-black z-10"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-2 h-2 rounded-full transition-colors ${idx === currentIndex ? 'bg-brand-accent' : 'bg-white/50'}`} 
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="p-6 md:p-8 flex flex-col flex-grow bg-[#0a0c0f] rounded-b-3xl text-left">
        <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold mb-3">{p.category || 'Modelo 3D'}</div>
        
        {/* Main Product Info Container */}
        <div className="flex flex-col flex-grow">
          <span className="text-white text-xl md:text-2xl font-bold mb-2 leading-tight tracking-tight block">
            {p.name}
          </span>
          <span className="text-sm text-brand-muted mb-6 font-normal leading-relaxed line-clamp-3 block">
            {p.desc}
          </span>
        </div>
        
        {/* Price on a separate dedicated line */}
        <div className="flex flex-col mt-auto pb-4">
          {p.originalPrice && (
            <span className="text-xs text-red-400/60 line-through mb-1 block">{p.originalPrice}</span>
          )}
          <span className={`text-3xl font-extrabold tracking-tight block ${p.originalPrice ? 'text-brand-accent' : 'text-white'}`}>
            {p.price}
          </span>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-white/5 mt-2">
          <button 
            className={`w-full py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
              isAdded 
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]' 
                : 'bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-black hover:shadow-[0_5px_15px_rgba(0,255,136,0.3)]'
            }`}
            onClick={handleAdd}
          >
            <ShoppingCart size={16} />
            {isAdded ? '¡AGREGADO!' : 'AGREGAR AL CARRITO'}
          </button>
        </div>
      </div>
    </div>
  );
});

const ProductModal = React.memo(function ProductModal({ p, onClose, onAdd }: { p: Product; onClose: () => void; onAdd: (p: Product) => void }) {
  const images = Array.from(new Set([p.img, ...(p.images || [])])).filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleAdd = () => {
    onAdd(p);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 600);
  };

  const nextImage = () => {
    setImgLoaded(false);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };
  const prevImage = () => {
    setImgLoaded(false);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const swipeHandlers = useSwipe({
    onSwipedLeft: nextImage,
    onSwipedRight: prevImage
  });

  let currentImgSrc = images[currentIndex] || '';
  if (currentImgSrc.match(/^https?:\/\/(www\.)?imgur\.com\/[a-zA-Z0-9]+$/)) {
    currentImgSrc = currentImgSrc.replace('imgur.com', 'i.imgur.com') + '.jpg';
  }
  const displaySrc = currentImgSrc.startsWith('http') || currentImgSrc.startsWith('/') || currentImgSrc.startsWith('data:') 
    ? currentImgSrc 
    : `https://placehold.co/800x600/222/555?text=${encodeURIComponent(currentImgSrc)}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="bg-[#0f1115] border border-white/5 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row relative shadow-[0_30px_100px_rgba(0,0,0,1)] selection:bg-brand-accent selection:text-black overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute top-4 right-4 md:top-6 md:right-6 z-20 bg-black/50 text-white/50 hover:text-white p-2.5 rounded-full transition-all hover:bg-white/10 hover:scale-110"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {/* Left: Image Gallery */}
        <div 
          className="w-full md:w-1/2 relative bg-gradient-to-br from-[#15181e] to-[#0a0c0f] min-h-[350px] md:min-h-[500px] flex items-center justify-center p-8"
          {...swipeHandlers}
        >
          {/* Subtle noise texture */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }} />
          
          {getDiscountPercent(p.price, p.originalPrice) > 0 && (
            <div className="absolute top-6 left-6 z-10 bg-brand-accent text-black text-[11px] font-extrabold px-4 py-2 rounded-full uppercase tracking-[0.2em] shadow-[0_5px_20px_rgba(0,255,136,0.2)] flex items-center gap-2">
              <Tag size={12} />
              {getDiscountPercent(p.price, p.originalPrice)}% OFF
            </div>
          )}
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
            </div>
          )}
          <img 
            key={displaySrc}
            src={displaySrc} 
            alt={p.name} 
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(true)}
            className={`w-full h-full object-contain drop-shadow-2xl max-h-[500px] transition-all duration-700 ease-out ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} 
            referrerPolicy="no-referrer" 
          />
          
          {images.length > 1 && (
            <>
              <button 
                onClick={prevImage} 
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 backdrop-blur-md border border-white/5 text-white p-3 rounded-full hover:bg-white/10 transition-all hover:scale-110"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={nextImage} 
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 backdrop-blur-md border border-white/5 text-white p-3 rounded-full hover:bg-white/10 transition-all hover:scale-110"
              >
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/5">
                {images.map((_, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => {
                      setImgLoaded(false);
                      setCurrentIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-brand-accent' : 'w-1.5 bg-white/30 hover:bg-white/60'}`} 
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: Details */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-[#0a0c0f]">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-brand-muted font-bold">
            <span className="w-8 h-[1px] bg-brand-accent/50"></span>
            {p.category || 'MODELO 3D'}
          </div>
          
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            {p.name}
          </h2>
          
          <div className="flex items-end gap-4 mb-8">
            <span className="text-4xl md:text-5xl font-extrabold text-brand-accent tracking-tighter drop-shadow-[0_0_20px_rgba(0,255,136,0.2)]">
              {p.price}
            </span>
            {p.originalPrice && (
              <div className="flex flex-col pb-1.5">
                <span className="text-sm text-red-400/60 line-through font-medium">{p.originalPrice}</span>
              </div>
            )}
          </div>
          
          <div className="h-[1px] w-full bg-gradient-to-r from-white/10 to-transparent mb-8" />
          
          <div className="text-brand-muted text-sm md:text-base leading-relaxed mb-10 flex-grow whitespace-pre-wrap font-medium">
            {p.desc || 'Modelo de alta resolución. Materiales premium y excelente nivel de detalle.'}
          </div>
          
          {/* Aesthetic feature tags */}
          <div className="flex gap-3 mb-10 text-[10px] uppercase tracking-wider font-bold text-white/50">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-white/5 bg-white/[0.02]"><span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span> Premium PLA</div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-white/5 bg-white/[0.02]"><span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span> Alta Precisión</div>
          </div>
          
          <button 
            onClick={handleAdd}
            className={`w-full py-4 md:py-5 rounded-2xl font-extrabold text-sm uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3 ${
              isAdded
                ? 'bg-white text-black scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.3)]'
                : 'bg-brand-accent text-black hover:scale-[1.02] hover:bg-white hover:text-black shadow-[0_10px_30px_rgba(0,255,136,0.15)] hover:shadow-[0_15px_40px_rgba(255,255,255,0.2)]'
            }`}
          >
            <ShoppingCart size={18} />
            {isAdded ? 'AÑADIDO AL CARRITO' : 'AÑADIR AL PEDIDO'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Categories Admin State
  const [predefinedCategories, setPredefinedCategories] = useState<string[]>(['Oficina', 'Decoración', 'Juegos', 'Coleccionables', 'Accesorios', 'Repuestos', 'Otros']);
  const [isCategoriesAdminOpen, setIsCategoriesAdminOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Categories State
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Categorías calculadas
  const categories = React.useMemo(() => {
    const fromProducts = products.map(p => p.category || 'Otros');
    const uniqueCombined = Array.from(new Set([...predefinedCategories, ...fromProducts]));
    const finalCategories = uniqueCombined.filter(c => c && c.trim() !== '' && c !== 'Todos');
    return ['Todos', ...finalCategories.sort()];
  }, [products, predefinedCategories]);

  // Productos filtrados calculados
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'Todos' || (p.category || 'Otros') === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.desc && p.desc.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    import('./firebase').then(({ isFirebaseConfigured, auth }) => {
      if (!isFirebaseConfigured || !auth) return;
      const unsubscribeAuth = auth.onAuthStateChanged((user: User | null) => {
        setUser(user);
      });
      return () => unsubscribeAuth();
    });
  }, []);

  const handleLogin = async () => {
    try {
      setAuthError(null);
      const provider = new GoogleAuthProvider();
      // Force account selection to avoid hanging promises if something is stuck
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Error logging in:", error);
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request' || error.message?.includes('INTERNAL ASSERTION FAILED')) {
        setAuthError("El navegador bloqueó la ventana de inicio de sesión. Por favor, haz clic en el ícono de 'Abrir en nueva pestaña' (arriba a la derecha de esta vista previa) para poder iniciar sesión correctamente.");
      } else {
        setAuthError("Error al iniciar sesión: " + error.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Admin Editor State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showcaseImages, setShowcaseImages] = useState<string[]>([]);
  const [currentShowcaseIndex, setCurrentShowcaseIndex] = useState(0);
  const [loadedShowcaseImgs, setLoadedShowcaseImgs] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (showcaseImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentShowcaseIndex(prev => (prev + 1) % showcaseImages.length);
    }, 4000); // Rota cada 4 segundos
    return () => clearInterval(timer);
  }, [showcaseImages.length]);

  const isAdmin = user?.email === "elninja732@gmail.com";

  const handleShowcaseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey) {
      alert("Falta configurar VITE_IMGBB_API_KEY en Vercel/Entorno para poder subir imágenes directamente.");
      return;
    }

    setUploadingImage(true);
    try {
      const uploadPromises = files.map((file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        return fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formData,
        }).then(res => res.json());
      });

      const results = await Promise.all(uploadPromises);
      const newUrls = results.filter(data => data.success).map(data => data.data.url);

      if (newUrls.length > 0) {
        const docRef = doc(db, 'products', 'site_showcase_image');
        const updatedImages = [...showcaseImages, ...newUrls];
        const defaultData = { name: "site_showcase_image", desc: "Showcase Config", price: "0" };
        
        await updateDoc(docRef, { images: updatedImages, ...defaultData }).catch(async () => {
             await setDoc(docRef, { images: updatedImages, ...defaultData });
        });
      } else {
        console.error("ImgBB showcase upload failed. Responses:", results);
        let errorMsg = "Error al subir imagen(es). Revisa ImgBB.";
        if (results.length > 0 && results[0].error) {
           errorMsg += ` Detalles: ${results[0].error.message}`;
        }
        alert(errorMsg);
      }
    } catch (error) {
      console.error("Error al subir imagen de exhibición:", error);
      alert("Error al subir imagen. Revisa la consola o tu conexión.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteShowcaseImage = async (index: number) => {
    // Updates UI optimistically so it feels instant
    const updatedImages = showcaseImages.filter((_, i) => i !== index);
    setShowcaseImages(updatedImages);
    
    if (currentShowcaseIndex >= updatedImages.length) {
      setCurrentShowcaseIndex(Math.max(0, updatedImages.length - 1));
    }

    try {
      const docRef = doc(db, 'products', 'site_showcase_image');
      const defaultData = { name: "site_showcase_image", desc: "Showcase Config", price: "0" };
      await updateDoc(docRef, { images: updatedImages }).catch(async () => {
         await setDoc(docRef, { images: updatedImages, ...defaultData });
      });
    } catch (error: any) {
      console.error("Error al eliminar la imagen del showcase:", error);
      alert('⚠️ Hubo un error de red al borrar en Firestore que impidió la acción. Error: ' + error.message);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMain: boolean = true) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey) {
      alert("Falta configurar VITE_IMGBB_API_KEY en Vercel/Entorno para poder subir imágenes directamente.");
      return;
    }

    setUploadingImage(true);
    try {
      const uploadPromises = files.map((file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        return fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formData,
        }).then(res => res.json());
      });

      const results = await Promise.all(uploadPromises);
      const newUrls = results.filter(data => data.success).map(data => data.data.url);

      if (newUrls.length === 0) {
        console.error("ImgBB upload failed. Responses:", results);
        let errorMsg = "Error al subir imagen(es). Revisa ImgBB.";
        if (results.length > 0 && results[0].error) {
           errorMsg += ` Detalles: ${results[0].error.message}`;
        }
        alert(errorMsg);
        return;
      }

      setEditingProduct(prev => {
        if (!prev) return null;
        if (isMain) {
          return { ...prev, img: newUrls[0] };
        } else {
          return { ...prev, images: [...(prev.images || []), ...newUrls] };
        }
      });
    } catch (error) {
      console.error("Error al subir imagen:", error);
      alert("Error al subir imagen. Revisa la consola o tu conexión.");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeGalleryImage = (indexToRemove: number) => {
    setEditingProduct(prev => {
      if (!prev) return null;
      const newImages = [...(prev.images || [])];
      newImages.splice(indexToRemove, 1);
      return { ...prev, images: newImages };
    });
  };

  const handleSaveProduct = async (productToSave: Product) => {
    try {
      if (isAddingNew) {
        await addDoc(collection(db, 'products'), productToSave);
      } else if (productToSave.id) {
        const productRef = doc(db, 'products', productToSave.id);
        const { id, ...dataToSave } = productToSave;
        await updateDoc(productRef, dataToSave as any);
      }
      setEditingProduct(null);
      setIsAddingNew(false);
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Hubo un error al guardar el producto. Revisa los permisos.");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));

    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error: any) {
      console.error("Error deleting product:", error);
      alert("Hubo un error de conexión, inténtalo de nuevo.");
    }
  };

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartIsAnimating, setCartIsAnimating] = useState(false);

  const handleSaveCategories = async () => {
    try {
      await setDoc(doc(db, 'products', 'site_settings'), { categories: predefinedCategories }, { merge: true });
      setIsCategoriesAdminOpen(false);
    } catch (error) {
      console.error("Error saving categories: ", error);
      alert("Error al guardar categorías. Solo el admin puede hacer esto.");
    }
  };

  const addCategory = () => {
    if (newCategoryName.trim() && !predefinedCategories.includes(newCategoryName.trim())) {
      setPredefinedCategories([...predefinedCategories, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };

  const removeCategory = (catToRemove: string) => {
    setPredefinedCategories(predefinedCategories.filter(c => c !== catToRemove));
  };

  const addToCart = React.useCallback((product: Product) => {
    setCart(prev => {
      const matchBy = product.id ? (item: CartItem) => item.id === product.id : (item: CartItem) => item.name === product.name;
      const existingItem = prev.find(matchBy);
      
      if (existingItem) {
        return prev.map(item => matchBy(item) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, cartId: Math.random().toString(), quantity: 1 }];
    });
    
    setCartIsAnimating(true);
    setTimeout(() => setCartIsAnimating(false), 300);
  }, []);

  const updateQuantity = React.useCallback((cartId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  }, []);

  const removeFromCart = React.useCallback((cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  }, []);

  const parsePrice = (priceVal: any) => {
    if (typeof priceVal === 'number') return priceVal;
    if (!priceVal) return 0;
    const numericStr = String(priceVal).replace(/[^0-9]/g, '');
    return parseInt(numericStr, 10) || 0;
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parseProductPrice(item.price) * item.quantity), 0);
  const formatPrice = (num: number) => `$${num.toLocaleString('es-AR')}`;

  const handleWhatsAppCheckout = React.useCallback(() => {
    if (cart.length === 0) return;
    let message = `¡Hola! Quiero realizar el siguiente pedido:\n\n`;
    cart.forEach(item => {
      message += `- ${item.quantity}x *${item.name}* (${item.price} c/u)\n`;
    });
    message += `\n*Total estimado: ${formatPrice(cartTotal)}*\n\n¿Tienen stock y cómo coordinamos el pago/envío?`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  }, [cart, cartTotal]);

  useEffect(() => {
    import('./firebase').then(({ isFirebaseConfigured }) => {
       if (!isFirebaseConfigured) {
          console.warn("Skipping Firestore sync since it's not configured in variables.");
          setProducts(INITIAL_PRODUCTS);
          setLoading(false);
          return;
       }

       const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
         const productsData: Product[] = [];
         let newShowcaseImages: string[] = [];
         let newPredefinedCategories: string[] | null = null;
         
         snapshot.forEach((doc) => {
           if (doc.id === 'site_showcase_image') {
             const data = doc.data();
             if (Array.isArray(data.images)) {
                newShowcaseImages = data.images;
             } else if (data.img) {
                newShowcaseImages = [data.img];
             }
           } else if (doc.id === 'site_settings') {
             const data = doc.data();
             if (Array.isArray(data.categories)) {
               newPredefinedCategories = data.categories;
             }
           } else {
             productsData.push({ id: doc.id, ...doc.data() } as Product);
           }
         });
         
         setShowcaseImages(newShowcaseImages);
         if (newPredefinedCategories) {
           setPredefinedCategories(newPredefinedCategories);
         }
         
         // Si no hay productos en Firebase, mostramos los iniciales por defecto
         if (productsData.length === 0) {
           setProducts(INITIAL_PRODUCTS);
         } else {
           setProducts(productsData);
         }
         setLoading(false);
       }, (error) => {
         console.warn('Network or permission issue fetching products - working in offline fallback mode:', error.message);
         // En caso de error de permisos o red, mostramos los productos por defecto
         setProducts(INITIAL_PRODUCTS);
         setLoading(false);
       });

       return () => unsubscribe();
    });
  }, []);

  return (
    <div className="relative min-h-screen pb-20 sm:pb-0">
      {/* Ambient background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-accent/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-accent/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-[1200px] mx-auto px-5 relative h-full">
        {authError && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-red-500/90 backdrop-blur-sm text-white p-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-top mt-0">
          <p className="font-semibold text-sm max-w-[1200px] mx-auto text-center flex-1">{authError}</p>
          <button onClick={() => setAuthError(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
      )}
      <header className="py-8 relative z-50">
        <nav className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img 
              src="https://i.ibb.co/C3kQTvdW/Mesa-de-trabajo-1-8-1.png" 
              alt="Next Layer Logo" 
              width="128"
              height="128"
              // @ts-ignore
              fetchPriority="high"
              className="h-24 md:h-32 w-auto object-contain"
            />
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden sm:flex items-center gap-8 text-sm font-semibold uppercase">
            <a href="#" className="text-brand-accent border-b-2 border-brand-accent pb-1 transition-colors">Inicio</a>
            <a href="#productos" className="hover:text-brand-accent hover:border-b-2 hover:border-brand-accent pb-1 transition-colors border-b-2 border-transparent">Productos</a>
            <a href="#contacto" className="hover:text-brand-accent hover:border-b-2 hover:border-brand-accent pb-1 transition-colors border-b-2 border-transparent">Contacto</a>
            
            {user ? (
              <button 
                onClick={handleLogout}
                title="Cerrar sesión (Admin)"
                className="text-white hover:text-red-400 transition-colors p-2"
              >
                <LogOut size={20} />
              </button>
            ) : (
              <button 
                onClick={handleLogin}
                title="Acceso Admin"
                className="text-white/30 hover:text-white transition-colors p-2"
              >
                <LogIn size={20} />
              </button>
            )}

            <button 
              onClick={() => setIsCartOpen(true)}
              className={`relative p-2 text-white hover:text-brand-accent transition-all duration-300 ${cartIsAnimating ? 'scale-125 text-brand-accent' : ''}`}
            >
              <ShoppingCart size={24} />
              {cart.length > 0 && (
                <span className={`absolute top-0 right-0 bg-brand-accent text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center transition-transform duration-300 ${cartIsAnimating ? 'scale-125' : ''}`}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Menu Button & Cart */}
          <div className="sm:hidden flex items-center gap-4">
            <button 
              onClick={() => setIsCartOpen(true)}
              className={`relative p-2 text-white hover:text-brand-accent transition-all duration-300 ${cartIsAnimating ? 'scale-125 text-brand-accent' : ''}`}
            >
              <ShoppingCart size={24} />
              {cart.length > 0 && (
                <span className={`absolute top-0 right-0 bg-brand-accent text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center transition-transform duration-300 ${cartIsAnimating ? 'scale-125' : ''}`}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
            <button 
              className="text-brand-accent p-2 focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={32} /> : <Menu size={32} />}
            </button>
          </div>
        </nav>

        {/* Mobile Nav Dropdown */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-brand-card/95 backdrop-blur-md border border-brand-accent/20 rounded-xl shadow-2xl flex flex-col p-6 gap-6 sm:hidden mt-2">
            <a href="#" onClick={() => setIsMobileMenuOpen(false)} className="text-brand-accent font-semibold uppercase text-lg text-center">Inicio</a>
            <a href="#productos" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-brand-accent font-semibold uppercase text-lg text-center transition-colors">Productos</a>
            <a href="#contacto" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-brand-accent font-semibold uppercase text-lg text-center transition-colors">Contacto</a>
          </div>
        )}
      </header>

      <section className="flex flex-col items-center justify-center pt-24 pb-16 text-center relative z-10 w-full max-w-5xl mx-auto px-4">
        <h1 className="text-6xl md:text-8xl font-black leading-[1.05] mb-6 uppercase tracking-[-0.02em] text-transparent bg-clip-text bg-gradient-to-tr from-white via-white to-white/60">
          Impresión 3D de<br />
          <span className="text-brand-accent drop-shadow-[0_0_40px_rgba(55,211,128,0.4)]">Alta Calidad</span>
        </h1>
        <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto text-brand-muted font-medium">
          Transformamos tus ideas en realidad con tecnología de última generación, precisión milimétrica y materiales premium.
        </p>
        <button 
          onClick={() => document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-brand-accent text-black px-12 py-5 rounded-full font-extrabold tracking-[0.15em] text-sm md:text-base uppercase transition-all duration-300 hover:scale-105 hover:bg-white hover:text-black shadow-[0_0_30px_rgba(55,211,128,0.4)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)]"
        >
          VISITÁ EL CATÁLOGO
        </button>
      </section>

      {/* Hero Showcase / Gallery Section */}
      {(showcaseImages.length > 0 || isAdmin) && (
        <section className="py-20 relative z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent" />
          
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold uppercase tracking-[2px] text-white">
              Nuestros <span className="text-brand-accent">Trabajos</span>
            </h2>
            <p className="text-brand-muted mt-3 max-w-2xl mx-auto text-sm">
              Un vistazo a la calidad, nivel de detalle y terminación de nuestras impresiones de exhibición.
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto relative group">
            {/* Main Showcase Container */}
            <div className={`relative ${showcaseImages.length === 0 ? 'aspect-[21/3] border-dashed border-2 bg-transparent flex items-center justify-center' : 'aspect-[16/9] md:aspect-[21/9] bg-black/50'} rounded-2xl overflow-hidden border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]`}>
              {isAdmin && (
                <div className={`${showcaseImages.length === 0 ? 'relative scale-150' : 'absolute top-4 right-4'} z-50 flex gap-2`}>
                  <label className="cursor-pointer bg-brand-accent text-black font-extrabold text-xs uppercase px-4 py-2 rounded-full hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_20px_rgba(55,211,128,0.5)]">
                    <Plus size={14} />
                    {uploadingImage ? 'SUBIENDO...' : (showcaseImages.length === 0 ? 'AÑADIR TU PRIMERA FOTO DE EXHIBICIÓN' : 'AÑADIR FOTOS')}
                    <input 
                      type="file" 
                      accept="image/*"
                      multiple
                      onChange={handleShowcaseImageUpload}
                      disabled={uploadingImage}
                      className="hidden" 
                    />
                  </label>
                  {showcaseImages.length > 0 && (
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteShowcaseImage(currentShowcaseIndex); }}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-transform hover:scale-105"
                      title="Eliminar foto actual"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
              
              {showcaseImages.length > 0 && (
                <>
                  <div className="absolute inset-0 bg-brand-accent/5 group-hover:bg-transparent transition-colors duration-500 z-20 pointer-events-none" />
                  
                  {showcaseImages.map((src, idx) => (
              <div 
                key={idx}
                className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${idx === currentShowcaseIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                {/* Fondo difuminado para rellenar (Evita el corte agresivo de object-cover) */}
                <div 
                  className={`absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-125 transition-opacity duration-1000 ${loadedShowcaseImgs[idx] ? 'opacity-40' : 'opacity-0'}`} 
                  style={{ backgroundImage: `url(${src})` }}
                />
                
                {!loadedShowcaseImgs[idx] && (
                  <div className="absolute inset-0 bg-white/5 animate-pulse z-20 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
                  </div>
                )}

                <img 
                  src={src} 
                  alt={`Muestra ${idx + 1}`}
                  loading="lazy"
                  onLoad={() => setLoadedShowcaseImgs(prev => ({ ...prev, [idx]: true }))}
                  className={`w-full h-full object-contain relative z-10 p-1 md:p-4 drop-shadow-2xl transition-all duration-[2000ms] ease-out ${idx === currentShowcaseIndex ? 'scale-100' : 'scale-[0.93]'} ${loadedShowcaseImgs[idx] ? 'opacity-100' : 'opacity-0'}`} 
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}

            {/* Overlay Gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none z-20" />
            
            <div className="absolute bottom-6 md:bottom-8 left-6 md:left-8 z-30 overflow-hidden rounded-lg">
              <div className="bg-black/80 backdrop-blur-md px-5 py-3 border border-white/10 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
                <span className="text-brand-accent font-extrabold text-xs md:text-sm uppercase tracking-[0.2em]">Exhibición General</span>
              </div>
            </div>

            {/* Carousel Indicators */}
            {showcaseImages.length > 1 && (
              <div className="absolute bottom-6 md:bottom-8 right-6 md:right-8 z-30 flex gap-2">
                {showcaseImages.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentShowcaseIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${idx === currentShowcaseIndex ? 'bg-brand-accent w-6' : 'bg-white/40 w-2 hover:bg-white/80'}`}
                  />
                ))}
              </div>
            )}
                </>
              )}
          </div>
          
          {/* Decorative glows around the image */}
          <div className="absolute -inset-4 bg-brand-accent/20 blur-[60px] -z-10 rounded-full opacity-40 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none" />
        </div>
      </section>
      )}

      {/* Impactful Features Section (Moved down) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 py-10 md:py-16 px-4 max-w-5xl mx-auto z-10 relative">
        <div className="border border-brand-accent p-6 md:p-8 rounded-2xl bg-black/40 flex flex-col items-center text-center transform transition-all duration-300 hover:scale-[1.03] hover:bg-black/60 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <div className="bg-brand-accent/10 p-4 rounded-full mb-5 relative group">
            <div className="absolute inset-0 bg-brand-accent/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <PenTool size={40} strokeWidth={1.5} className="text-brand-accent relative z-10" />
          </div>
          <h3 className="text-brand-accent text-xl md:text-2xl font-black mb-3 uppercase tracking-[0.1em] leading-tight flex flex-col gap-1">
            <span>Diseños</span>
            <span>Personalizados</span>
          </h3>
          <p className="text-brand-muted text-sm md:text-base leading-relaxed mt-1 font-medium">Creamos piezas únicas adaptadas a tus necesidades específicas.</p>
        </div>
        <div className="border border-brand-accent p-6 md:p-8 rounded-2xl bg-black/40 flex flex-col items-center text-center transform transition-all duration-300 hover:scale-[1.03] hover:bg-black/60 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <div className="bg-brand-accent/10 p-4 rounded-full mb-5 relative group">
            <div className="absolute inset-0 bg-brand-accent/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Clock size={40} strokeWidth={1.5} className="text-brand-accent relative z-10" />
          </div>
          <h3 className="text-brand-accent text-xl md:text-2xl font-black mb-3 uppercase tracking-[0.1em] leading-tight flex flex-col gap-1">
            <span>Entrega</span>
            <span>Rápida</span>
          </h3>
          <p className="text-brand-muted text-sm md:text-base leading-relaxed mt-1 font-medium">Producción eficiente con tiempos de entrega optimizados.</p>
        </div>
        <div className="border border-brand-accent p-6 md:p-8 rounded-2xl bg-black/40 flex flex-col items-center text-center transform transition-all duration-300 hover:scale-[1.03] hover:bg-black/60 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <div className="bg-brand-accent/10 p-4 rounded-full mb-5 relative group">
            <div className="absolute inset-0 bg-brand-accent/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <ShieldCheck size={40} strokeWidth={1.5} className="text-brand-accent relative z-10" />
          </div>
          <h3 className="text-brand-accent text-xl md:text-2xl font-black mb-3 uppercase tracking-[0.1em] leading-tight flex flex-col gap-1">
            <span>Calidad</span>
            <span>Garantizada</span>
          </h3>
          <p className="text-brand-muted text-sm md:text-base leading-relaxed mt-1 font-medium">Materiales de primera calidad y control riguroso de acabados.</p>
        </div>
      </section>

      <section id="productos" className="pb-20">
        <h2 className="text-center text-3xl font-extrabold text-brand-accent my-10 uppercase tracking-[2px]">
          Productos
        </h2>
        
        {/* Herramientas de filtrado y búsqueda */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 max-w-6xl mx-auto">
          {/* Categorías */}
          <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-black/30 border border-white/5 rounded-full shadow-inner">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full text-[13px] font-bold uppercase tracking-wider transition-all duration-300 ${
                  selectedCategory === cat 
                    ? 'bg-brand-accent text-black shadow-[0_0_10px_rgba(0,255,136,0.3)]' 
                    : 'bg-transparent text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative w-full md:w-auto min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
            <input
              type="text"
              placeholder="Buscar modelos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-full py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/50 transition-all placeholder:text-white/30"
            />
          </div>
        </div>
        
        {isAdmin && (
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10 w-full max-w-2xl mx-auto">
            <button
              onClick={() => {
                setEditingProduct({ name: '', desc: '', price: '', img: '', category: '' });
                setIsAddingNew(true);
              }}
              className="bg-brand-accent text-black px-6 py-3 rounded-full font-extrabold text-xs md:text-sm uppercase flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,255,136,0.2)] hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] flex-1"
            >
              <Plus size={18} /> AÑADIR NUEVO PRODUCTO
            </button>
            <button
              onClick={() => setIsCategoriesAdminOpen(true)}
              className="bg-black/50 border border-white/20 text-white px-6 py-3 rounded-full font-extrabold text-xs md:text-sm uppercase flex items-center justify-center gap-2 hover:bg-white/10 transition-colors flex-1"
            >
              <Tag size={18} /> GESTIONAR CATEGORÍAS
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-10 text-brand-muted">Cargando productos...</div>
          ) : (
            filteredProducts.map((p, i) => (
              <ProductCard 
                key={p.id || i} 
                p={p} 
                onClick={setSelectedProduct} 
                onAdd={addToCart} 
                userAdmin={isAdmin}
                onEdit={setEditingProduct}
                onDelete={handleDeleteProduct}
              />
            ))
          )}
        </div>
        
        {/* Custom Order Call to Action for 3D Printing */}
        <div className="mt-24 max-w-4xl mx-auto text-center bg-black/40 border border-brand-accent/20 rounded-3xl p-8 md:p-14 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/10 to-transparent pointer-events-none" />
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-accent/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-brand-accent/30 transition-colors duration-700" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-brand-accent/20 rounded-2xl flex items-center justify-center mb-6 text-brand-accent group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(55,211,128,0.2)]">
              <Send size={32} />
            </div>
            
            <h3 className="text-2xl md:text-3xl font-extrabold uppercase tracking-widest text-white mb-4">
              ¿Tenés tu propio <span className="text-brand-accent">diseño 3D?</span>
            </h3>
            
            <p className="text-brand-muted max-w-lg mb-8 leading-relaxed font-medium">
              Si encontraste un modelo en Thingiverse, Cults3D, Printables o tienes un archivo STL personalizado, envíalo y te lo cotizamos sin cargo.
            </p>
            
            <button 
              onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('¡Hola! Tengo un archivo STL/diseño 3D y me gustaría pedir una cotización.')}`, '_blank')}
              className="bg-white text-black px-8 py-4 rounded-full font-extrabold tracking-wider text-sm flex items-center gap-2 hover:bg-brand-accent transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(55,211,128,0.4)] hover:scale-105"
            >
              COTIZAR MI ARCHIVO AHORA
            </button>
          </div>
        </div>
      </section>

      <section id="contacto" className="py-15 pb-25">
        <h2 className="text-center text-3xl font-extrabold text-brand-accent mb-2 uppercase tracking-[2px]">
          Contacto
        </h2>
        <p className="text-center text-base mb-15">
          ¿Tenés un proyecto en mente? Estamos acá para ayudarte
        </p>
        
        <div className="flex justify-center">
          <div className="text-[15px] flex flex-col md:flex-row gap-8 md:gap-16 items-center text-center">
            
            <div className="flex flex-col items-center">
              <span className="block mb-2 text-brand-muted uppercase tracking-widest text-xs font-bold">Vía E-mail</span>
              <a href="mailto:nextlayer@gmail.com" className="text-brand-accent text-lg font-semibold hover:underline">
                nextlayer@gmail.com
              </a>
            </div>
            
            <div className="hidden md:block w-px h-12 bg-white/10"></div>
            
            <div className="flex flex-col items-center">
              <span className="block mb-2 text-brand-muted uppercase tracking-widest text-xs font-bold">En nuestro Instagram</span>
              <a href="https://instagram.com/nextlayer.3d" target="_blank" rel="noreferrer" className="text-brand-accent text-lg font-semibold hover:underline">
                @nextlayer.3d
              </a>
            </div>
            
            <div className="hidden md:block w-px h-12 bg-white/10"></div>

            <div className="flex flex-col items-center">
              <span className="block mb-2 text-brand-muted uppercase tracking-widest text-xs font-bold">Por WhatsApp</span>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="text-brand-accent text-lg font-semibold hover:underline flex items-center gap-2">
                <MessageCircle size={20} />
                351 340-3129
              </a>
            </div>
            
          </div>
        </div>
      </section>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductModal p={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />
      )}

      {/* Admin Categories Editor Modal */}
      {isCategoriesAdminOpen && isAdmin && (
        <div className="fixed inset-0 z-[80] flex justify-center items-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0f1115] border border-white/10 rounded-3xl w-full max-w-lg shadow-[0_30px_100px_rgba(0,0,0,1)] relative flex flex-col overflow-hidden max-h-[90vh]">
            <button 
              onClick={() => setIsCategoriesAdminOpen(false)} 
              className="absolute top-6 right-6 z-40 bg-black/50 text-white/50 hover:text-white p-2.5 rounded-full hover:bg-white/10 transition-all"
            >
              <X size={20} />
            </button>

            <div className="p-8 md:p-10 flex flex-col h-full min-h-0 overflow-hidden">
              <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-brand-muted font-bold shrink-0">
                <span className="w-8 h-[1px] bg-brand-accent/50"></span>
                PREFERENCIAS DE CATÁLOGO
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-8 tracking-tight shrink-0">
                Gestionar Categorías
              </h2>

              <div className="flex bg-black/30 p-1 rounded-xl border border-white/5 mb-8 shrink-0">
                <input 
                  type="text" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej. Soportes"
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                  className="flex-1 bg-transparent border-none px-4 py-3 text-sm text-white focus:outline-none placeholder:text-white/30"
                />
                <button 
                  onClick={addCategory}
                  className="bg-brand-accent text-black px-6 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-white transition-colors"
                >
                  Agregar
                </button>
              </div>

              <div className="overflow-y-auto flex-1 mb-8 pr-2 space-y-2 min-h-0">
                {predefinedCategories.length === 0 && (
                  <p className="text-center text-white/40 text-sm italic py-8 border border-dashed border-white/10 rounded-xl shrink-0">
                    No hay categorías predefinidas.
                  </p>
                )}
                {predefinedCategories.map(cat => (
                  <div key={cat} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:border-brand-accent/30 transition-colors group shrink-0">
                    <span className="text-white font-medium">{cat}</span>
                    <button 
                      onClick={() => removeCategory(cat)}
                      className="text-white/20 hover:text-red-400 p-2 rounded-full hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-white/5 mt-auto shrink-0">
                <button 
                  onClick={handleSaveCategories}
                  className="w-full bg-brand-accent text-black py-4 rounded-xl font-extrabold text-sm uppercase tracking-[0.1em] hover:bg-white transition-all duration-300 shadow-[0_5px_20px_rgba(0,255,136,0.2)] hover:shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
                >
                  GUARDAR CONFIGURACIÓN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Product Editor Modal */}
      {editingProduct && isAdmin && (
        <div className="fixed inset-0 z-[70] flex justify-center items-center p-2 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-brand-card/95 border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl relative flex flex-col md:flex-row overflow-hidden my-auto max-h-full">
            <button 
              onClick={() => { setEditingProduct(null); setIsAddingNew(false); }} 
              className="absolute top-4 right-4 z-40 bg-black/50 text-white/70 hover:text-white p-2 rounded-full hover:bg-brand-accent hover:text-black transition-colors"
            >
              <X size={24} />
            </button>
            
            {/* Left Side: Live Preview (Hidden on small screens) */}
            <div className="hidden md:flex flex-col w-1/3 min-w-[300px] border-r border-white/10 p-6 bg-black/20 gap-4 overflow-y-auto">
              <h3 className="text-sm font-extrabold tracking-widest text-brand-muted uppercase text-center mb-2">Vista Previa</h3>
              <div className="pointer-events-none sticky top-0">
                <ProductCard p={editingProduct} onClick={() => {}} onAdd={() => {}} />
              </div>
            </div>

            {/* Right Side: Form */}
            <div className="flex-1 p-6 md:p-10 flex flex-col gap-6 overflow-y-auto">
              <div className="mb-2">
                <h2 className="text-3xl font-extrabold text-brand-accent uppercase tracking-wider mb-2">
                  {isAddingNew ? 'Añadir Producto' : 'Editar Producto'}
                </h2>
                <p className="text-brand-muted text-sm border-b border-white/10 pb-4">
                  Completa los detalles de tu producto. Los cambios se guardarán en tu base de datos y se aplicarán al instante.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Info */}
                <div className="flex flex-col gap-5">
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-4">
                    <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-1 items-center flex gap-2">
                      <Tag size={14} className="text-brand-accent"/> Información Básica
                    </h4>
                    <div>
                      <label className="block text-[11px] font-bold text-brand-muted mb-1 uppercase tracking-wider">Nombre del Producto</label>
                      <input 
                        type="text" 
                        value={editingProduct.name || ''} 
                        onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-brand-accent focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-brand-muted mb-1 uppercase tracking-wider flex justify-between">
                        <span>Categoría</span>
                        <button onClick={() => setIsCategoriesAdminOpen(true)} className="text-brand-accent hover:text-white underline" type="button">EDITAR</button>
                      </label>
                      <input 
                        type="text" 
                        value={editingProduct.category || ''} 
                        onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                        placeholder="Ej. Oficina, Juegos..."
                        list="category-suggestions"
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-brand-accent focus:outline-none transition-colors"
                      />
                      <datalist id="category-suggestions">
                        {predefinedCategories.map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-brand-muted mb-1 uppercase tracking-wider">Descripción</label>
                      <textarea 
                        value={editingProduct.desc || ''} 
                        onChange={(e) => setEditingProduct({...editingProduct, desc: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-brand-accent focus:outline-none transition-colors resize-none h-24"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing & Media */}
                <div className="flex flex-col gap-5">
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-4">
                    <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-1 items-center flex gap-2">
                      <div className="text-brand-accent font-serif pr-1">$</div> Precio y Ofertas
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-brand-muted mb-1 uppercase tracking-wider">Precio de Venta</label>
                        <input 
                          type="text" 
                          value={editingProduct.price || ''} 
                          onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                          placeholder="ej. $40,000"
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-brand-accent focus:outline-none transition-colors font-bold text-brand-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-brand-muted mb-1 uppercase tracking-wider flex items-center justify-between">
                          Original
                          {getDiscountPercent(editingProduct.price, editingProduct.originalPrice) > 0 && (
                            <span className="text-brand-accent text-[9px] bg-brand-accent/20 px-1 rounded truncate">
                              -{getDiscountPercent(editingProduct.price, editingProduct.originalPrice)}%
                            </span>
                          )}
                        </label>
                        <input 
                          type="text" 
                          value={editingProduct.originalPrice || ''} 
                          onChange={(e) => setEditingProduct({...editingProduct, originalPrice: e.target.value})}
                          placeholder="Ej. $50,000"
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-brand-accent focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-4">
                    <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-1 items-center flex gap-2">
                      <Edit2 size={14} className="text-brand-accent"/> Imágenes
                    </h4>
                    <div>
                      <label className="block text-[11px] font-bold text-brand-muted mb-1 uppercase tracking-wider">Foto Principal (URL / Subir)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={editingProduct.img || ''} 
                          onChange={(e) => setEditingProduct({...editingProduct, img: e.target.value})}
                          placeholder="Ingresa URL"
                          className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-brand-accent focus:outline-none transition-colors"
                        />
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleImageUpload(e, true)} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                            disabled={uploadingImage}
                          />
                          <div className={`h-full px-4 rounded-lg flex items-center justify-center font-bold text-xs uppercase tracking-wider ${uploadingImage ? 'bg-brand-muted text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                            {uploadingImage ? '...' : 'SUBIR'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <label className="flex justify-between items-center text-[11px] font-bold text-brand-muted mb-2 uppercase tracking-wider border-t border-white/10 pt-4">
                        <span>Galería Extra</span>
                        <div className="relative cursor-pointer text-brand-accent hover:text-white transition-colors overflow-hidden font-extrabold bg-brand-accent/10 px-2 py-1 rounded">
                          <input 
                            type="file" 
                            accept="image/*"
                            multiple
                            onChange={(e) => handleImageUpload(e, false)} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                            disabled={uploadingImage}
                          />
                          + FOTOS
                        </div>
                      </label>
                      {(editingProduct.images && editingProduct.images.length > 0) ? (
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                          {editingProduct.images.map((imgUrl, idx) => (
                            <div key={idx} className="relative aspect-square bg-black/50 rounded border border-white/10 group overflow-hidden shadow-inner">
                              <img src={imgUrl} alt="galería" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                              <button 
                                onClick={() => removeGalleryImage(idx)}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-white/30 italic mt-2 text-center p-3 border border-dashed border-white/10 rounded-lg">No hay fotos adicionales.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-white/10">
                <button 
                  onClick={() => handleSaveProduct(editingProduct)}
                  className="w-full bg-brand-accent text-black py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider hover:scale-[1.02] shadow-[0_5px_20px_rgba(0,255,136,0.3)] transition-all duration-300"
                >
                  GUARDAR CAMBIOS EN LA TIENDA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md bg-brand-card h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-extrabold text-brand-accent flex items-center gap-2">
                <ShoppingCart size={24} />
                TU CARRITO
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="text-white/70 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {cart.length === 0 ? (
                <div className="text-center text-brand-muted my-auto">
                  <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Tu carrito está vacío</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartId} className="flex gap-4 bg-black/30 p-4 rounded-xl border border-white/5">
                    <img src={item.img && typeof item.img === 'string' && (item.img.startsWith('http') || item.img.startsWith('/') || item.img.startsWith('data:')) ? item.img : `https://placehold.co/100x100/222/555?text=${encodeURIComponent(item.img || item.name || 'Item')}`} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-bold text-sm leading-tight mb-1">{item.name}</h3>
                      <span className="text-brand-accent font-extrabold text-sm mb-2">{item.price}</span>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-3 bg-black/50 rounded-lg px-2 py-1">
                          <button onClick={() => updateQuantity(item.cartId, -1)} className="text-white/70 hover:text-white"><Minus size={14} /></button>
                          <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.cartId, 1)} className="text-white/70 hover:text-white"><Plus size={14} /></button>
                        </div>
                        <button onClick={() => removeFromCart(item.cartId)} className="text-red-400 hover:text-red-300 p-1">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-white/10 bg-black/20">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-brand-muted font-semibold">Total estimado</span>
                  <span className="text-2xl font-extrabold text-white">{formatPrice(cartTotal)}</span>
                </div>
                <button 
                  onClick={handleWhatsAppCheckout}
                  className="w-full bg-[#25D366] text-white py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-transform hover:scale-[1.02] hover:opacity-90 shadow-[0_0_20px_rgba(37,211,102,0.3)] flex items-center justify-center gap-2"
                >
                  <MessageCircle size={20} />
                  ENVIAR PEDIDO POR WHATSAPP
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating WhatsApp Button */}
      <a 
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("¡Hola! Vengo de la tienda online y tengo una consulta.")}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:scale-110 transition-transform duration-300 flex items-center justify-center"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle size={32} />
      </a>

      {/* Persistent Bottom Nav Mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#0f1115] border-t border-white/10 z-[100] flex justify-around items-center p-3 pb-safe-area-inset-bottom shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <a href="#" className="flex flex-col items-center gap-1 text-brand-muted hover:text-brand-accent transition-colors">
          <Home size={20} />
          <span className="text-[10px] uppercase font-bold tracking-wider">Inicio</span>
        </a>
        <a href="#productos" className="flex flex-col items-center gap-1 text-brand-muted hover:text-brand-accent transition-colors">
          <Package size={20} />
          <span className="text-[10px] uppercase font-bold tracking-wider">Productos</span>
        </a>
        <a href="#contacto" className="flex flex-col items-center gap-1 text-brand-muted hover:text-brand-accent transition-colors">
          <MessageCircle size={20} />
          <span className="text-[10px] uppercase font-bold tracking-wider">Contacto</span>
        </a>
        <button onClick={() => setIsCartOpen(true)} className="flex flex-col items-center gap-1 text-brand-muted hover:text-brand-accent transition-colors relative">
          <div className="relative">
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-brand-accent text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider">Carrito</span>
        </button>
      </div>

    </div>
    </div>
  );
}
