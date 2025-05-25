import { useCallback } from "react";
import useContractInstance from "./useContractInstance";
import { parseUnits, formatUnits } from "ethers";

export function useCollateralCalculator() {
  const contract = useContractInstance(false);

  const calculateCollateral = useCallback(
    async (cusdAmount) => {
      if (!contract) {
        throw new Error("Contract not initialized");
      }

      try {
        const amountInWei = parseUnits(cusdAmount.toString(), 18);

        const collateralWei = await contract.getRequiredCollateralAmount(amountInWei);

        const collateralFormatted = formatUnits(collateralWei, 18); 

        return collateralFormatted;
      } catch (error) {
        console.error("Error calculating collateral:", error);
        throw error;
      }
    },
    [contract]
  );

  return calculateCollateral;
}