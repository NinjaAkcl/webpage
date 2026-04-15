import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronLeft, ChevronRight, Tag, MessageCircle, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { collection, onSnapshot, getDocs, addDoc } from 'firebase/firestore';
import { db } from './firebase';

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
}

interface CartItem extends Product {
  cartId: string;
  quantity: number;
}

const INITIAL_PRODUCTS: Product[] = [
  { name: 'Organizador de Escritorio Minimal', desc: 'Porta lápices y herramientas con diseño compacto. Ideal para escritorio o estudio.', price: '$50,000', img: 'Foto+Organizador' },
  { name: 'Bandeja Organizadora "Wave"', desc: 'Bandeja multipropósito con compartimentos para accesorios, herramientas o PC.', price: '$50,000', img: 'Foto+Bandeja+Wave' },
  { name: 'Colgante Arco Minimalista', desc: 'Diseño geométrico moderno, liviano y elegante. Diferentes colores disponibles.', price: '$50,000', img: 'Foto+Colgante' },
  { name: 'Figura Coleccionable Articulada', desc: 'Personaje con piezas móviles y gran detalle. Ideal para colección o decoración.', price: '$50,000', img: 'Foto+Figura' },
  { name: 'Set de Ajedrez Impreso 3D', desc: 'Piezas completas + tablero. Perfecto para jugar o exhibir.', price: '$50,000', img: 'Foto+Ajedrez' },
  { name: 'Soporte Articulado para Celular', desc: 'Brazo ajustable para sostener el teléfono en escritorio. Útil para grabar o contenido.', price: '$50,000', img: 'Foto+Soporte' },
];

const ProductCard: React.FC<{ p: Product; onClick: () => void; onAdd: (p: Product) => void }> = ({ p, onClick, onAdd }) => {
  const images = p.images && p.images.length > 0 ? p.images : [p.img];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(p);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1000);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };
  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

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
      className="bg-brand-card rounded-2xl overflow-hidden flex flex-col border border-white/5 hover:border-brand-accent/30 transition-all duration-500 ease-out hover:shadow-[0_10px_40px_-10px_rgba(0,255,136,0.2)] hover:-translate-y-2 cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/20">
        {p.discountBadge && (
          <div className="absolute top-3 left-3 z-10 bg-red-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-[0_2px_10px_rgba(239,68,68,0.5)] flex items-center gap-1">
            <Tag size={10} />
            {p.discountBadge}
          </div>
        )}
        <img 
          src={displaySrc} 
          alt={p.name} 
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" 
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
      <div className="p-5 flex flex-col flex-grow">
        <div className="text-brand-accent text-lg font-bold mb-2 leading-tight">{p.name}</div>
        <div className="text-sm text-brand-muted mb-5 flex-grow line-clamp-2">{p.desc}</div>
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            {p.originalPrice && (
              <span className="text-xs text-red-400/80 line-through mb-0.5">{p.originalPrice}</span>
            )}
            <span className={`text-xl font-extrabold ${p.originalPrice ? 'text-brand-accent' : 'text-white'}`}>{p.price}</span>
          </div>
          <button 
            className={`px-4 py-2 rounded-full font-extrabold text-xs uppercase transition-all duration-300 flex items-center gap-1.5 ${
              isAdded 
                ? 'bg-brand-accent text-black scale-105 shadow-[0_0_15px_rgba(0,255,136,0.5)]' 
                : 'bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-black'
            }`}
            onClick={handleAdd}
          >
            <ShoppingCart size={14} />
            {isAdded ? '¡AGREGADO!' : 'AGREGAR'}
          </button>
        </div>
      </div>
    </div>
  );
}

const ProductModal: React.FC<{ p: Product; onClose: () => void; onAdd: (p: Product) => void }> = ({ p, onClose, onAdd }) => {
  const images = p.images && p.images.length > 0 ? p.images : [p.img];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = () => {
    onAdd(p);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 600);
  };

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  let currentImgSrc = images[currentIndex] || '';
  if (currentImgSrc.match(/^https?:\/\/(www\.)?imgur\.com\/[a-zA-Z0-9]+$/)) {
    currentImgSrc = currentImgSrc.replace('imgur.com', 'i.imgur.com') + '.jpg';
  }
  const displaySrc = currentImgSrc.startsWith('http') || currentImgSrc.startsWith('/') || currentImgSrc.startsWith('data:') 
    ? currentImgSrc 
    : `https://placehold.co/800x600/222/555?text=${encodeURIComponent(currentImgSrc)}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-brand-card border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute top-4 right-4 z-20 bg-black/50 text-white/70 hover:text-white p-2 rounded-full transition-colors hover:bg-brand-accent hover:text-black"
          onClick={onClose}
        >
          <X size={24} />
        </button>

        {/* Left: Image Gallery */}
        <div className="w-full md:w-1/2 relative bg-black/30 min-h-[300px] md:min-h-[400px] flex items-center justify-center">
          {p.discountBadge && (
            <div className="absolute top-4 left-4 z-10 bg-red-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-[0_2px_15px_rgba(239,68,68,0.5)] flex items-center gap-1.5">
              <Tag size={14} />
              {p.discountBadge}
            </div>
          )}
          <img 
            src={displaySrc} 
            alt={p.name} 
            className="w-full h-full object-contain max-h-[500px]" 
            referrerPolicy="no-referrer" 
          />
          {images.length > 1 && (
            <>
              <button 
                onClick={prevImage} 
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full hover:bg-brand-accent hover:text-black transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={nextImage} 
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full hover:bg-brand-accent hover:text-black transition-colors"
              >
                <ChevronRight size={24} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-brand-accent' : 'bg-white/50 hover:bg-white'}`} 
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: Details */}
        <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col">
          <h2 className="text-2xl md:text-3xl font-extrabold text-brand-accent mb-4 leading-tight">{p.name}</h2>
          
          <div className="flex items-end gap-3 mb-6 pb-6 border-b border-white/10">
            <span className={`text-4xl font-extrabold ${p.originalPrice ? 'text-brand-accent' : 'text-white'}`}>{p.price}</span>
            {p.originalPrice && (
              <div className="flex flex-col mb-1">
                <span className="text-sm text-red-400/80 line-through">{p.originalPrice}</span>
                <span className="text-[10px] text-brand-muted uppercase tracking-wider font-semibold">Precio original</span>
              </div>
            )}
          </div>
          
          <div className="text-brand-muted text-base leading-relaxed mb-8 flex-grow whitespace-pre-wrap">
            {p.desc}
          </div>
          
          <button 
            onClick={handleAdd}
            className={`w-full py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,136,0.2)] ${
              isAdded
                ? 'bg-white text-black scale-[1.02]'
                : 'bg-brand-accent text-black hover:scale-[1.02] hover:opacity-90'
            }`}
          >
            <ShoppingCart size={20} />
            {isAdded ? '¡AGREGADO AL CARRITO!' : 'AGREGAR AL CARRITO'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartIsAnimating, setCartIsAnimating] = useState(false);

  const addToCart = (product: Product) => {
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
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const parsePrice = (priceStr: string) => {
    const numericStr = priceStr.replace(/[^0-9]/g, '');
    return parseInt(numericStr, 10) || 0;
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0);
  const formatPrice = (num: number) => `$${num.toLocaleString('es-AR')}`;

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;
    let message = `¡Hola! Quiero realizar el siguiente pedido:\n\n`;
    cart.forEach(item => {
      message += `- ${item.quantity}x *${item.name}* (${item.price} c/u)\n`;
    });
    message += `\n*Total estimado: ${formatPrice(cartTotal)}*\n\n¿Tienen stock y cómo coordinamos el pago/envío?`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData: Product[] = [];
      snapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      
      // Si no hay productos en Firebase, mostramos los iniciales por defecto
      if (productsData.length === 0) {
        setProducts(INITIAL_PRODUCTS);
      } else {
        setProducts(productsData);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      // En caso de error de permisos, mostramos los productos por defecto
      setProducts(INITIAL_PRODUCTS);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-5">
      <header className="py-8 relative z-50">
        <nav className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Next Layer Logo" 
              className="h-24 md:h-32 w-auto object-contain"
            />
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden sm:flex items-center gap-8 text-sm font-semibold uppercase">
            <a href="#" className="text-brand-accent border-b-2 border-brand-accent pb-1 transition-colors">Inicio</a>
            <a href="#productos" className="hover:text-brand-accent hover:border-b-2 hover:border-brand-accent pb-1 transition-colors border-b-2 border-transparent">Productos</a>
            <a href="#contacto" className="hover:text-brand-accent hover:border-b-2 hover:border-brand-accent pb-1 transition-colors border-b-2 border-transparent">Contacto</a>
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

      <section className="flex flex-col md:flex-row items-center justify-between py-20 gap-10">
        <div className="flex-1">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.1] mb-5 uppercase">
            Impresión 3D de<br />Alta Calidad
          </h1>
          <p className="text-base mb-8 max-w-[400px]">
            Transformamos tus ideas en realidad con tecnología de impresión 3D de última generación
          </p>
          <button className="bg-brand-accent text-black px-6 py-3 rounded-full font-extrabold text-sm uppercase transition-transform hover:scale-105 hover:opacity-90">
            VER CATÁLOGO
          </button>
        </div>
        <div className="flex-1 flex justify-end">
          <img 
            src="https://placehold.co/500x400/151515/37d380?text=Foto+Impresora+y+Florero" 
            alt="Impresora 3D Next Layer" 
            className="max-w-full h-auto rounded-lg" 
            referrerPolicy="no-referrer" 
          />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 py-12">
        <div className="border border-brand-accent p-8 text-center rounded bg-black/50">
          <div className="text-brand-accent text-sm font-extrabold mb-2.5 uppercase">Diseños Personalizados</div>
          <div className="text-[13px]">Creamos piezas únicas adaptadas a tus necesidades específicas</div>
        </div>
        <div className="border border-brand-accent p-8 text-center rounded bg-black/50">
          <div className="text-brand-accent text-sm font-extrabold mb-2.5 uppercase">Entrega Rápida</div>
          <div className="text-[13px]">Producción eficiente con tiempos de entrega optimizados</div>
        </div>
        <div className="border border-brand-accent p-8 text-center rounded bg-black/50">
          <div className="text-brand-accent text-sm font-extrabold mb-2.5 uppercase">Calidad Garantizada</div>
          <div className="text-[13px]">Materiales de primera calidad y control riguroso de acabados</div>
        </div>
      </section>

      <section id="productos" className="pb-20">
        <h2 className="text-center text-3xl font-extrabold text-brand-accent my-15 uppercase tracking-[2px]">
          Productos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-10 text-brand-muted">Cargando productos...</div>
          ) : products.map((p, i) => (
            <ProductCard key={p.id || i} p={p} onClick={() => setSelectedProduct(p)} onAdd={addToCart} />
          ))}
        </div>
      </section>

      <section id="contacto" className="py-15 pb-25">
        <h2 className="text-center text-3xl font-extrabold text-brand-accent mb-2 uppercase tracking-[2px]">
          Contacto
        </h2>
        <p className="text-center text-base mb-15">
          ¿Tenés un proyecto en mente? Estamos acá para ayudarte
        </p>
        
        <div className="flex flex-col md:flex-row gap-15">
          <div className="flex-1 text-[15px]">
            <p className="mb-5">Utiliza las siguientes vías de contacto, o rellena el formulario.</p>
            
            <div className="mb-4">
              <span className="block mb-1">Vía E-mail</span>
              <a href="mailto:nextlayer@gmail.com" className="text-brand-accent font-semibold hover:underline">
                nextlayer@gmail.com
              </a>
            </div>
            <div className="mb-4">
              <span className="block mb-1">En nuestro Instagram</span>
              <a href="https://instagram.com/nextlayer1" target="_blank" rel="noreferrer" className="text-brand-accent font-semibold hover:underline">
                @nextlayer1
              </a>
            </div>
            <div className="mb-4">
              <span className="block mb-1">Por WhatsApp</span>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="text-brand-accent font-semibold hover:underline flex items-center gap-2">
                <MessageCircle size={16} />
                351 340-3129
              </a>
            </div>
          </div>
          
          <form className="flex-1 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="text" 
              placeholder="Escribe tu nombre" 
              required 
              className="w-full p-4 rounded bg-white text-black text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-accent" 
            />
            <input 
              type="email" 
              placeholder="Escribe tu e-mail" 
              required 
              className="w-full p-4 rounded bg-white text-black text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-accent" 
            />
            <input 
              type="tel" 
              placeholder="Escribe tu teléfono (Opcional)" 
              className="w-full p-4 rounded bg-white text-black text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-accent" 
            />
            <textarea 
              placeholder="Escribí tu mensaje" 
              required 
              className="w-full p-4 rounded bg-white text-black text-sm placeholder:text-gray-600 h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-accent"
            ></textarea>
            <button 
              type="submit" 
              className="self-end mt-2 bg-brand-accent text-black px-6 py-3 rounded-full font-extrabold text-sm uppercase transition-transform hover:scale-105 hover:opacity-90"
            >
              ENVIAR MENSAJE
            </button>
          </form>
        </div>
      </section>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductModal p={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />
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
                    <img src={item.img.startsWith('http') || item.img.startsWith('/') ? item.img : `https://placehold.co/100x100/222/555?text=${encodeURIComponent(item.img)}`} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
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
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:scale-110 transition-transform duration-300 flex items-center justify-center"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle size={32} />
      </a>
    </div>
  );
}
