// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package bindings

import (
	"context"
	"errors"
	"math/big"
	"strings"
	"time"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
	_ = time.Tick
	_ = context.Background
)

// LanternMarketQuote is an auto generated low-level Go binding around an user-defined struct.
type LanternMarketQuote struct {
	AgentId   *big.Int
	User      common.Address
	TokenIn   common.Address
	TokenOut  common.Address
	AmountIn  *big.Int
	MinOut    *big.Int
	QuotedOut *big.Int
	Deadline  *big.Int
	Nonce     *big.Int
	Routes    []LanternMarketRoute
}

// LanternMarketRoute is an auto generated low-level Go binding around an user-defined struct.
type LanternMarketRoute struct {
	Bps   uint16
	Pools []common.Address
}

// LanternMarketMetaData contains all meta data concerning the LanternMarket contract.
var LanternMarketMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"registry_\",\"type\":\"address\",\"internalType\":\"contractAgentRegistry\"},{\"name\":\"reputation_\",\"type\":\"address\",\"internalType\":\"contractReputation\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"FEE_BPS\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"executeSwap\",\"inputs\":[{\"name\":\"quote\",\"type\":\"tuple\",\"internalType\":\"structLanternMarket.Quote\",\"components\":[{\"name\":\"agentId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"user\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenIn\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenOut\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amountIn\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"minOut\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"quotedOut\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"deadline\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"nonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"routes\",\"type\":\"tuple[]\",\"internalType\":\"structLanternMarket.Route[]\",\"components\":[{\"name\":\"bps\",\"type\":\"uint16\",\"internalType\":\"uint16\"},{\"name\":\"pools\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"quoteDigest\",\"inputs\":[{\"name\":\"quote\",\"type\":\"tuple\",\"internalType\":\"structLanternMarket.Quote\",\"components\":[{\"name\":\"agentId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"user\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenIn\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenOut\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amountIn\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"minOut\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"quotedOut\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"deadline\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"nonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"routes\",\"type\":\"tuple[]\",\"internalType\":\"structLanternMarket.Route[]\",\"components\":[{\"name\":\"bps\",\"type\":\"uint16\",\"internalType\":\"uint16\"},{\"name\":\"pools\",\"type\":\"address[]\",\"internalType\":\"address[]\"}]}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"registry\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"contractAgentRegistry\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"reputation\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"contractReputation\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"usedNonce\",\"inputs\":[{\"name\":\"agentId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"nonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"event\",\"name\":\"TradeSettled\",\"inputs\":[{\"name\":\"agentId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"user\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenIn\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"tokenOut\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"amountIn\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"amountOut\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"fee\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"nonce\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false}]",
}

// LanternMarketABI is the input ABI used to generate the binding from.
// Deprecated: Use LanternMarketMetaData.ABI instead.
var LanternMarketABI = LanternMarketMetaData.ABI

// LanternMarket is an auto generated Go binding around an Ethereum contract.
type LanternMarket struct {
	LanternMarketCaller     // Read-only binding to the contract
	LanternMarketTransactor // Write-only binding to the contract
	LanternMarketFilterer   // Log filterer for contract events
}

// LanternMarketCaller is an auto generated read-only Go binding around an Ethereum contract.
type LanternMarketCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LanternMarketTransactor is an auto generated write-only Go binding around an Ethereum contract.
type LanternMarketTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LanternMarketFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type LanternMarketFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// LanternMarketSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type LanternMarketSession struct {
	Contract     *LanternMarket    // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// LanternMarketCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type LanternMarketCallerSession struct {
	Contract *LanternMarketCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts        // Call options to use throughout this session
}

// LanternMarketTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type LanternMarketTransactorSession struct {
	Contract     *LanternMarketTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts        // Transaction auth options to use throughout this session
}

// LanternMarketRaw is an auto generated low-level Go binding around an Ethereum contract.
type LanternMarketRaw struct {
	Contract *LanternMarket // Generic contract binding to access the raw methods on
}

// LanternMarketCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type LanternMarketCallerRaw struct {
	Contract *LanternMarketCaller // Generic read-only contract binding to access the raw methods on
}

// LanternMarketTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type LanternMarketTransactorRaw struct {
	Contract *LanternMarketTransactor // Generic write-only contract binding to access the raw methods on
}

// NewLanternMarket creates a new instance of LanternMarket, bound to a specific deployed contract.
func NewLanternMarket(address common.Address, backend bind.ContractBackend) (*LanternMarket, error) {
	contract, err := bindLanternMarket(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &LanternMarket{LanternMarketCaller: LanternMarketCaller{contract: contract}, LanternMarketTransactor: LanternMarketTransactor{contract: contract}, LanternMarketFilterer: LanternMarketFilterer{contract: contract}}, nil
}

// NewLanternMarketCaller creates a new read-only instance of LanternMarket, bound to a specific deployed contract.
func NewLanternMarketCaller(address common.Address, caller bind.ContractCaller) (*LanternMarketCaller, error) {
	contract, err := bindLanternMarket(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &LanternMarketCaller{contract: contract}, nil
}

// NewLanternMarketTransactor creates a new write-only instance of LanternMarket, bound to a specific deployed contract.
func NewLanternMarketTransactor(address common.Address, transactor bind.ContractTransactor) (*LanternMarketTransactor, error) {
	contract, err := bindLanternMarket(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &LanternMarketTransactor{contract: contract}, nil
}

// NewLanternMarketFilterer creates a new log filterer instance of LanternMarket, bound to a specific deployed contract.
func NewLanternMarketFilterer(address common.Address, filterer bind.ContractFilterer) (*LanternMarketFilterer, error) {
	contract, err := bindLanternMarket(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &LanternMarketFilterer{contract: contract}, nil
}

// bindLanternMarket binds a generic wrapper to an already deployed contract.
func bindLanternMarket(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := LanternMarketMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LanternMarket *LanternMarketRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LanternMarket.Contract.LanternMarketCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LanternMarket *LanternMarketRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LanternMarket.Contract.LanternMarketTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LanternMarket *LanternMarketRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LanternMarket.Contract.LanternMarketTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_LanternMarket *LanternMarketCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _LanternMarket.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_LanternMarket *LanternMarketTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _LanternMarket.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_LanternMarket *LanternMarketTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _LanternMarket.Contract.contract.Transact(opts, method, params...)
}

// FEEBPS is a free data retrieval call binding the contract method 0xbf333f2c.
//
// Solidity: function FEE_BPS() view returns(uint256)
func (_LanternMarket *LanternMarketCaller) FEEBPS(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _LanternMarket.contract.Call(opts, &out, "FEE_BPS")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// FEEBPS is a free data retrieval call binding the contract method 0xbf333f2c.
//
// Solidity: function FEE_BPS() view returns(uint256)
func (_LanternMarket *LanternMarketSession) FEEBPS() (*big.Int, error) {
	return _LanternMarket.Contract.FEEBPS(&_LanternMarket.CallOpts)
}

// FEEBPS is a free data retrieval call binding the contract method 0xbf333f2c.
//
// Solidity: function FEE_BPS() view returns(uint256)
func (_LanternMarket *LanternMarketCallerSession) FEEBPS() (*big.Int, error) {
	return _LanternMarket.Contract.FEEBPS(&_LanternMarket.CallOpts)
}

// QuoteDigest is a free data retrieval call binding the contract method 0x68f8eeb5.
//
// Solidity: function quoteDigest((uint256,address,address,address,uint256,uint256,uint256,uint256,uint256,(uint16,address[])[]) quote) view returns(bytes32)
func (_LanternMarket *LanternMarketCaller) QuoteDigest(opts *bind.CallOpts, quote LanternMarketQuote) ([32]byte, error) {
	var out []interface{}
	err := _LanternMarket.contract.Call(opts, &out, "quoteDigest", quote)

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// QuoteDigest is a free data retrieval call binding the contract method 0x68f8eeb5.
//
// Solidity: function quoteDigest((uint256,address,address,address,uint256,uint256,uint256,uint256,uint256,(uint16,address[])[]) quote) view returns(bytes32)
func (_LanternMarket *LanternMarketSession) QuoteDigest(quote LanternMarketQuote) ([32]byte, error) {
	return _LanternMarket.Contract.QuoteDigest(&_LanternMarket.CallOpts, quote)
}

// QuoteDigest is a free data retrieval call binding the contract method 0x68f8eeb5.
//
// Solidity: function quoteDigest((uint256,address,address,address,uint256,uint256,uint256,uint256,uint256,(uint16,address[])[]) quote) view returns(bytes32)
func (_LanternMarket *LanternMarketCallerSession) QuoteDigest(quote LanternMarketQuote) ([32]byte, error) {
	return _LanternMarket.Contract.QuoteDigest(&_LanternMarket.CallOpts, quote)
}

// Registry is a free data retrieval call binding the contract method 0x7b103999.
//
// Solidity: function registry() view returns(address)
func (_LanternMarket *LanternMarketCaller) Registry(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _LanternMarket.contract.Call(opts, &out, "registry")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Registry is a free data retrieval call binding the contract method 0x7b103999.
//
// Solidity: function registry() view returns(address)
func (_LanternMarket *LanternMarketSession) Registry() (common.Address, error) {
	return _LanternMarket.Contract.Registry(&_LanternMarket.CallOpts)
}

// Registry is a free data retrieval call binding the contract method 0x7b103999.
//
// Solidity: function registry() view returns(address)
func (_LanternMarket *LanternMarketCallerSession) Registry() (common.Address, error) {
	return _LanternMarket.Contract.Registry(&_LanternMarket.CallOpts)
}

// Reputation is a free data retrieval call binding the contract method 0xc52164c6.
//
// Solidity: function reputation() view returns(address)
func (_LanternMarket *LanternMarketCaller) Reputation(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _LanternMarket.contract.Call(opts, &out, "reputation")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Reputation is a free data retrieval call binding the contract method 0xc52164c6.
//
// Solidity: function reputation() view returns(address)
func (_LanternMarket *LanternMarketSession) Reputation() (common.Address, error) {
	return _LanternMarket.Contract.Reputation(&_LanternMarket.CallOpts)
}

// Reputation is a free data retrieval call binding the contract method 0xc52164c6.
//
// Solidity: function reputation() view returns(address)
func (_LanternMarket *LanternMarketCallerSession) Reputation() (common.Address, error) {
	return _LanternMarket.Contract.Reputation(&_LanternMarket.CallOpts)
}

// UsedNonce is a free data retrieval call binding the contract method 0x02fab424.
//
// Solidity: function usedNonce(uint256 agentId, uint256 nonce) view returns(bool)
func (_LanternMarket *LanternMarketCaller) UsedNonce(opts *bind.CallOpts, agentId *big.Int, nonce *big.Int) (bool, error) {
	var out []interface{}
	err := _LanternMarket.contract.Call(opts, &out, "usedNonce", agentId, nonce)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// UsedNonce is a free data retrieval call binding the contract method 0x02fab424.
//
// Solidity: function usedNonce(uint256 agentId, uint256 nonce) view returns(bool)
func (_LanternMarket *LanternMarketSession) UsedNonce(agentId *big.Int, nonce *big.Int) (bool, error) {
	return _LanternMarket.Contract.UsedNonce(&_LanternMarket.CallOpts, agentId, nonce)
}

// UsedNonce is a free data retrieval call binding the contract method 0x02fab424.
//
// Solidity: function usedNonce(uint256 agentId, uint256 nonce) view returns(bool)
func (_LanternMarket *LanternMarketCallerSession) UsedNonce(agentId *big.Int, nonce *big.Int) (bool, error) {
	return _LanternMarket.Contract.UsedNonce(&_LanternMarket.CallOpts, agentId, nonce)
}

// ExecuteSwap is a paid mutator transaction binding the contract method 0xf335d973.
//
// Solidity: function executeSwap((uint256,address,address,address,uint256,uint256,uint256,uint256,uint256,(uint16,address[])[]) quote, bytes signature) returns()
func (_LanternMarket *LanternMarketTransactor) ExecuteSwap(opts *bind.TransactOpts, quote LanternMarketQuote, signature []byte) (*types.Transaction, error) {
	return _LanternMarket.contract.Transact(opts, "executeSwap", quote, signature)
}

// ExecuteSwap is a paid mutator transaction binding the contract method 0xf335d973.
//
// Solidity: function executeSwap((uint256,address,address,address,uint256,uint256,uint256,uint256,uint256,(uint16,address[])[]) quote, bytes signature) returns()
func (_LanternMarket *LanternMarketSession) ExecuteSwap(quote LanternMarketQuote, signature []byte) (*types.Transaction, error) {
	return _LanternMarket.Contract.ExecuteSwap(&_LanternMarket.TransactOpts, quote, signature)
}

// ExecuteSwap is a paid mutator transaction binding the contract method 0xf335d973.
//
// Solidity: function executeSwap((uint256,address,address,address,uint256,uint256,uint256,uint256,uint256,(uint16,address[])[]) quote, bytes signature) returns()
func (_LanternMarket *LanternMarketTransactorSession) ExecuteSwap(quote LanternMarketQuote, signature []byte) (*types.Transaction, error) {
	return _LanternMarket.Contract.ExecuteSwap(&_LanternMarket.TransactOpts, quote, signature)
}

// LanternMarketTradeSettledIterator is returned from FilterTradeSettled and is used to iterate over the raw logs and unpacked data for TradeSettled events raised by the LanternMarket contract.
type LanternMarketTradeSettledIterator struct {
	Event *LanternMarketTradeSettled // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *LanternMarketTradeSettledIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(LanternMarketTradeSettled)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(LanternMarketTradeSettled)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *LanternMarketTradeSettledIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *LanternMarketTradeSettledIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// LanternMarketTradeSettled represents a TradeSettled event raised by the LanternMarket contract.
type LanternMarketTradeSettled struct {
	AgentId   *big.Int
	User      common.Address
	TokenIn   common.Address
	TokenOut  common.Address
	AmountIn  *big.Int
	AmountOut *big.Int
	Fee       *big.Int
	Nonce     *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterTradeSettled is a free log retrieval operation binding the contract event 0xdac06f4b338e22ad588400b8a33152bcc89d081fc40421abbf4d653cbe3d0b8d.
//
// Solidity: event TradeSettled(uint256 indexed agentId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 fee, uint256 nonce)
func (_LanternMarket *LanternMarketFilterer) FilterTradeSettled(opts *bind.FilterOpts, agentId []*big.Int, user []common.Address) (*LanternMarketTradeSettledIterator, error) {

	var agentIdRule []interface{}
	for _, agentIdItem := range agentId {
		agentIdRule = append(agentIdRule, agentIdItem)
	}
	var userRule []interface{}
	for _, userItem := range user {
		userRule = append(userRule, userItem)
	}

	logs, sub, err := _LanternMarket.contract.FilterLogs(opts, "TradeSettled", agentIdRule, userRule)
	if err != nil {
		return nil, err
	}
	return &LanternMarketTradeSettledIterator{contract: _LanternMarket.contract, event: "TradeSettled", logs: logs, sub: sub}, nil
}

// WatchTradeSettled is a free log subscription operation binding the contract event 0xdac06f4b338e22ad588400b8a33152bcc89d081fc40421abbf4d653cbe3d0b8d.
//
// Solidity: event TradeSettled(uint256 indexed agentId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 fee, uint256 nonce)
func (_LanternMarket *LanternMarketFilterer) WatchTradeSettled(opts *bind.WatchOpts, sink chan<- *LanternMarketTradeSettled, agentId []*big.Int, user []common.Address) (event.Subscription, error) {

	var agentIdRule []interface{}
	for _, agentIdItem := range agentId {
		agentIdRule = append(agentIdRule, agentIdItem)
	}
	var userRule []interface{}
	for _, userItem := range user {
		userRule = append(userRule, userItem)
	}

	logs, sub, err := _LanternMarket.contract.WatchLogs(opts, "TradeSettled", agentIdRule, userRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(LanternMarketTradeSettled)
				if err := _LanternMarket.contract.UnpackLog(event, "TradeSettled", log); err != nil {
					// If the signature doesn't match, skip this log.
					if errors.Is(err, bind.ErrEventSignatureMismatch) {
						continue
					}
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseTradeSettled is a log parse operation binding the contract event 0xdac06f4b338e22ad588400b8a33152bcc89d081fc40421abbf4d653cbe3d0b8d.
//
// Solidity: event TradeSettled(uint256 indexed agentId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 fee, uint256 nonce)
func (_LanternMarket *LanternMarketFilterer) ParseTradeSettled(log types.Log) (*LanternMarketTradeSettled, error) {
	event := new(LanternMarketTradeSettled)
	if err := _LanternMarket.contract.UnpackLog(event, "TradeSettled", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
