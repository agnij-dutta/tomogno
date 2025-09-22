import {
	Base8,
	Fr,
	type Point,
	addPoint,
	mulPointEscalar,
} from "@zk-kit/baby-jubjub";
import { formatPrivKeyForBabyJub, genRandomBabyJubValue } from "maci-crypto";
import { BASE_POINT_ORDER } from "../constants";

/**
 * Implements El-Gamal encryption on BabyJubJub curve
 * @param publicKey BabyJubJub public key
 * @param point Point to encrypt
 * @param random Randomness for the encryption
 * @returns [c1,c2] - returns 2 different points as a ciphertext
 */
export const encryptPoint = (
	publicKey: bigint[],
	point: bigint[],
	random = genRandomBabyJubValue(),
): [Point<bigint>, Point<bigint>] => {
	const c1 = mulPointEscalar(Base8, random);
	const pky = mulPointEscalar(publicKey as Point<bigint>, random);
	const c2 = addPoint(point as Point<bigint>, pky);

	return [c1, c2];
};

/**
 * Implements El-Gamal encryption on scalar message on BabyJubJub curve
 * @param publicKey Public key to encrypt the message
 * @param message  Message to encrypt
 * @param random Randomness for the encryption
 * @returns { cipher: [c1,c2], random: bigint } - returns 2 different points as a ciphertext and the randomness used
 */
export const encryptMessage = (
	publicKey: bigint[],
	message: bigint,
	random = genRandomBabyJubValue(),
): { cipher: [bigint[], bigint[]]; random: bigint } => {
	let encRandom = random;
	if (encRandom >= BASE_POINT_ORDER) {
		encRandom = genRandomBabyJubValue() / 100n;
	}
	const p = mulPointEscalar(Base8, message);

	return {
		cipher: encryptPoint(publicKey, p, encRandom),
		random: encRandom,
	};
};

/**
 * Implements El-Gamal decryption on BabyJubJub curve
 * @param privateKey - Private key to decrypt the point
 * @param c1 - First part of the cipher
 * @param c2 - Second part of the cipher
 * @returns Point - returns the decrypted point
 */
export const decryptPoint = (
	privateKey: bigint,
	c1: bigint[],
	c2: bigint[],
): bigint[] => {
	const privKey = formatPrivKeyForBabyJub(privateKey);

	// Ensure the point is properly formatted for mulPointEscalar
	const c1Point: Point<bigint> = [c1[0], c1[1]];
	const c1x = mulPointEscalar(c1Point, privKey);
	
	// Calculate the inverse point by negating the x-coordinate
	// Convert to field element, negate, then convert back to bigint
	const negatedX = Fr.neg(Fr.e(c1x[0]));
	const c1xInverse: Point<bigint> = [BigInt(negatedX.toString()), c1x[1]];
	const c2Point: Point<bigint> = [c2[0], c2[1]];
	
	return addPoint(c2Point, c1xInverse);
};
