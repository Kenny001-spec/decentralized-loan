import React, { useEffect, useState, useCallback, useMemo } from "react";
import { TrendingUp, ShieldCheck, Target, X } from "lucide-react";
import { useLoanRequests } from "../context/LoanContext";
import { useAppKitAccount } from "@reown/appkit/react";
import useGetLoanTotalRepayment from "../hooks/useGetLoanTotalRepayment";
import { useCollateralCalculator } from "../hooks/useCollateralCalculator";
import useWithdrawRewards from "../hooks/useWithdrawRewards";
import useGetOwnerAddress from "../hooks/useGetOwnerAddress";
import { toast } from "react-toastify";
import useGetContractLinkBalance from "../hooks/useGetContractLinkBalance";

const Card = ({ children, className }) => (
  <div className={`rounded-xl ${className}`}>{children}</div>
);

const DashboardContent = () => {
  const [activeLoans, setActiveLoans] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [loanPayments, setLoanPayments] = useState({});
  const [requiredCollateral, setRequiredCollateral] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [ownerAddress, setOwnerAddress] = useState(null);
  const [contractBalance, setContractBalance] = useState("0");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
 
  const { address } = useAppKitAccount();
  const getAllLoanRequests = useGetLoanTotalRepayment();
  const fetchRequiredCollateral = useCollateralCalculator();
  const { loanRequests } = useLoanRequests();
  const withdrawalHandler = useWithdrawRewards();
  const getOwnerAddress = useGetOwnerAddress();
  const getContractBalance = useGetContractLinkBalance();

  const fetchLoanPaymentDetails = useCallback(async (loanId) => {
    try {
      const paymentDetails = await getAllLoanRequests(loanId);
      setLoanPayments((prev) => ({
        ...prev,
        [loanId]: paymentDetails,
      }));
    } catch (error) {
      console.error("Error fetching payment details:", error);
    }
  }, [getAllLoanRequests]);

  const fetchCollateralDetails = useCallback(async (loanId, loanAmount) => {
    try {
      const collateral = await fetchRequiredCollateral(loanAmount);
      setRequiredCollateral((prev) => ({
        ...prev,
        [loanId]: Number(collateral),
      }));
    } catch (error) {
      console.error("Error fetching collateral details:", error);
    }
  }, [fetchRequiredCollateral]);

  useEffect(() => {
    const fetchOwnerAddress = async () => {
      const ownerAddress = await getOwnerAddress();
      setOwnerAddress(ownerAddress);

      const balance = await getContractBalance();

      setContractBalance(Number(balance));
    };

    fetchOwnerAddress();
  }, [getOwnerAddress, getContractBalance]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const active = loanRequests?.filter((loan) => loan.isActive).length;
        const total = loanRequests?.reduce((sum, loan) => sum + Number(loan.amount), 0);
        setActiveLoans(active);
        setTotalValue(total);

        loanRequests?.filter((loan) => loan.isActive)?.forEach((loan) => fetchLoanPaymentDetails(loan.loanId));
        loanRequests
          ?.filter((loan) => !loan.isActive && !loan.hasRepaid)
          ?.forEach((loan) => fetchCollateralDetails(loan.loanId, loan.amount));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [loanRequests, fetchLoanPaymentDetails, fetchCollateralDetails]);

  const isOwner = useMemo(() => {
    return address && ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase();
  }, [address, ownerAddress]);

  const handleWithdrawal = useCallback(async () => {
    if (!withdrawAddress) {
      toast.error("Input valid address");
      return;
    }

    setIsWithdrawing(true);

    try {
      const result = await withdrawalHandler(withdrawAddress);
      if (result) {
        setWithdrawAddress("");
        setContractBalance("0");
      }
    } catch (error) {
      console.error("Withdrawal Error:", error);
      toast.error("Withdrawal failed. Please try again.");
    } finally {
      setIsWithdrawing(false);
    }
  }, [withdrawAddress, withdrawalHandler]);

 
  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 bg-black min-h-screen flex flex-col justify-center md:block">
      {/* Welcome Message */}

      <div className="flex flex-col space-y-6 justify-center items-center sm:flex-row sm:justify-between">

        <div className="text-gray-100 text-xl sm:text-2xl font-semibold">
          Welcome, {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "user"}
        </div>

      </div>

      {/* Withdraw Section (Only for Owner) */}
      {isOwner && (
        <div className="w-full max-w-xs sm:max-w-sm">
          <Card className="bg-gradient-to-br from-red-950 to-gray-900">
            <div className="p-4">
              <div className="flex justify-between items-end">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-100 mb-4">Contract Balance:</h3>
                <div className="mb-4">
                  <p className="text-gray-100 text-sm sm:text-lg font-light">{Number(contractBalance).toFixed(3)} cUSD</p>
                </div>
              </div>

              <div className="flex gap-2 space-x-2 justify-center items-center">
                <input
                  type="text"
                  placeholder="Enter address"
                  required
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="p-1 w-[70%] sm:w-[80%] bg-gray-800 text-gray-100 text-sm sm:text-base rounded-lg focus:outline-none"
                  disabled={isWithdrawing}
                />
                <button
                  onClick={handleWithdrawal}
                  disabled={isWithdrawing}
                  className="px-2 py-1 text-sm sm:text-base bg-red-600 w-[30%] sm:w-[35%] text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                >
                  {isWithdrawing ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    </div>
                  ) : (
                    "Withdraw"
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Market Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-br from-blue-950 to-gray-900">
          <div className="p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">Platform's Active Loans</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-100 mt-2">{activeLoans}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-900/20 rounded-full">
                <Target className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-950 to-gray-900">
          <div className="p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">Total Value Locked</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-100 mt-2">{totalValue.toFixed(2)} cUSD</p>
              </div>
              <div className="p-2 sm:p-3 bg-emerald-900/20 rounded-full">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-950 to-gray-900">
          <div className="p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">Collateral Ratio</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-100 mt-2">120%</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-900/20 rounded-full">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Your Active Positions */}
        <Card className="bg-gradient-to-br from-gray-950 to-gray-900">
          <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-100 mb-4">Your Active Positions</h3>
            <div className="space-y-4">
              {loanRequests
                .filter((loan) => loan.isActive && String(loan.borrower).toLowerCase() === address?.toString().toLowerCase())
                .map((loan) => (
                  <div key={loan.loanId} className="p-3 sm:p-4 bg-gray-900/50 rounded-xl hover:bg-gray-900/70 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-gray-100 font-medium text-sm sm:text-base">Loan #{loan.loanId}</span>
                        <p className="text-xs sm:text-sm text-gray-400">Amount: {Number(loan.amount).toFixed(2)} cUSD</p>
                      </div>
                      <span className="px-2 py-1 bg-emerald-900/20 text-emerald-400 text-xs rounded-full">Active</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm mt-2">
                      <span className="text-gray-400">Collateral: {Number(loan.collateralAmount).toFixed(3)} CELO</span>
                    </div>
                    <span className="text-gray-400">Interest: {loan.maxInterestRate}%</span>
                    {loanPayments[loan.loanId] && (
                      <div className="mt-2 text-xs sm:text-sm text-gray-400">
                        <p>Total Payment: {Number(loanPayments[loan.loanId].totalPayment).toFixed(5)} cUSD</p>
                        <p>Principal: {Number(loanPayments[loan.loanId].principal).toFixed(1)} cUSD</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </Card>

        {/* Latest Opportunities */}
        <Card className="bg-gradient-to-br from-gray-950 to-gray-900">
          <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-100 mb-4">Latest Opportunities</h3>
            <div className="space-y-4">
              {loanRequests
                ?.filter((loan) => !loan.isActive && !loan.hasRepaid)
                ?.map((loan) => (
                  <div key={loan.loanId} className="p-3 sm:p-4 bg-gray-900/50 rounded-xl hover:bg-gray-900/70 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-gray-100 font-medium text-sm sm:text-base">{Number(loan.amount)} cUSD Requested</p>
                        <p className="font-medium text-xs sm:text-sm"><span className="text-gray-400">Interest: {loan.maxInterestRate}%</span></p>
                        {requiredCollateral[loan.loanId] && (
                          <p className="text-xs sm:text-sm text-gray-400">
                            Collateral Paid: {Number(requiredCollateral[loan.loanId]).toFixed(3)} CELO
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm mt-2">
                      <span className="text-gray-400">Duration: {loan.duration} {loan.isDays ? "Days" : "Months"}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default React.memo(DashboardContent);