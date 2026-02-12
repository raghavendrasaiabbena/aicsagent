export interface OrderItem {
  product: string;
  qty:     number;
  price:   string;
}

export interface Order {
  orderNumber:       string;
  date:              string;
  paymentStatus:     string;
  fulfillmentStatus: string;
  total:             string;
  refunded:          string | null;
  refundDate:        string | null;
  shippingCity:      string;
  shippingCountry:   string;
  customerName:      string;
  cancelled:         boolean;
  items:             OrderItem[];
}

export interface Source {
  title:    string;
  source:   string;
  score:    number;
  category: string;
  language: string;
}

export interface Message {
  id:              string;
  role:            'user' | 'assistant';
  content:         string;
  intent?:         string;
  sentiment?:      string;
  orders?:         Order[] | null;
  sources?:        Source[];
  escalated?:      boolean;
  escalationReason?: string | null;
  ms?:             number;
}

export interface ChatResponse {
  reply:            string;
  intent:           string;
  language:         string;
  sentiment:        string;
  orders:           Order[] | null;
  sources:          Source[];
  escalated:        boolean;
  escalationReason: string | null;
  ms:               number;
}
