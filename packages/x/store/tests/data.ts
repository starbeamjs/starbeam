import { faker } from "@faker-js/faker";

export interface Person {
  id: string;
  name: string;
  age: number;
  visits: number;
  status: "active" | "inactive";
}

function CreatePerson(): () => Person {
  let id = 1;

  return (): Person => {
    return {
      id: String(id++),
      name: faker.name.fullName(),
      age: faker.datatype.number({ min: 18, max: 65 }),
      visits: faker.datatype.number({ min: 0, max: 1000 }),
      status: faker.helpers.arrayElement(["active", "inactive"]),
    };
  };
}

export const People = (): Person[] => {
  return Array.from({ length: 100 }, CreatePerson());
};

Array.from({ length: 5 }, CreatePerson()); //?
