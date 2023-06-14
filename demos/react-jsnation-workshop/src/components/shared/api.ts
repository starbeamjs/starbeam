export interface ApiUser {
  id: number;
  name: string;
  username: string;
  email: string;
  address: ApiAddress;
  phone: string;
  website: string;
  company: ApiCompany;
}

export interface ApiAddress {
  street: string;
  suite: string;
  city: string;
  zipcode: string;
  geo: ApiGeo;
}

export interface ApiGeo {
  lat: string;
  lng: string;
}

export interface ApiCompany {
  name: string;
  catchPhrase: string;
  bs: string;
}
